const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

const MAX_RETRIES = 5;

function sameVariant(a, b) {
  return (a?.size || null) === (b?.size || null) && (a?.color || null) === (b?.color || null);
}

async function mutateCart(userId, mutate) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], version: 0 });
    }
    const newItems = mutate(cart);
    const updated = await Cart.findOneAndUpdate(
      { user: userId, version: cart.version },
      { $set: { items: newItems }, $inc: { version: 1 } },
      { new: true }
    );
    if (updated) return updated;
  }
  throw new ApiError(409, 'Cart is being updated elsewhere, please try again');
}

async function buildCartResponse(cart) {
  const productIds = [...new Set(cart.items.map((i) => i.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  function enrich(item) {
    const product = productMap.get(item.product.toString());
    if (!product) {
      return {
        itemId: item._id,
        product: null,
        variant: item.variant,
        quantity: item.quantity,
        issue: 'product_deleted',
      };
    }
    const variantDoc = product.hasVariants
      ? product.findVariant(item.variant?.size, item.variant?.color)
      : null;
    const currentPrice = product.price + (variantDoc?.priceModifier || 0);
    const availableStock = product.hasVariants ? variantDoc?.stock ?? 0 : product.stock;

    let issue = null;
    if (product.hasVariants && !variantDoc) issue = 'variant_unavailable';
    else if (availableStock < 1) issue = 'out_of_stock';
    else if (availableStock < item.quantity) issue = 'insufficient_stock';
    else if (currentPrice !== item.priceAtAdd) issue = 'price_changed';

    return {
      itemId: item._id,
      product: { id: product._id, name: product.name, images: product.images, brand: product.brand },
      variant: item.variant,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      currentPrice,
      availableStock,
      issue,
      addedAt: item.addedAt,
    };
  }

  const items = cart.items.filter((i) => !i.savedForLater).map(enrich);
  const savedForLater = cart.items.filter((i) => i.savedForLater).map(enrich);
  return { items, savedForLater };
}

const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.userId });
  if (!cart) cart = await Cart.create({ user: req.userId, items: [] });
  ok(res, await buildCartResponse(cart));
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variant } = req.body;
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, 'Invalid product id');
  if (quantity < 1) throw new ApiError(400, 'Quantity must be at least 1');

  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');

  let availableStock = product.stock;
  if (product.hasVariants) {
    const variantDoc = product.findVariant(variant?.size, variant?.color);
    if (!variantDoc) throw new ApiError(400, 'Please select a valid size/color');
    availableStock = variantDoc.stock;
  }
  if (availableStock < quantity) throw new ApiError(409, 'Not enough stock available');

  const priceAtAdd =
    product.price + (product.hasVariants ? product.findVariant(variant?.size, variant?.color).priceModifier : 0);

  const updated = await mutateCart(req.userId, (cart) => {
    const items = [...cart.items];
    const existingIdx = items.findIndex(
      (i) => i.product.toString() === productId && !i.savedForLater && sameVariant(i.variant, variant)
    );
    if (existingIdx >= 0) {
      items[existingIdx] = { ...items[existingIdx].toObject(), quantity: items[existingIdx].quantity + quantity };
    } else {
      items.push({ product: productId, variant: variant || {}, quantity, priceAtAdd, savedForLater: false });
    }
    return items;
  });

  ok(res, await buildCartResponse(updated));
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(400, 'Quantity must be a positive integer');
  }
  const updated = await mutateCart(req.userId, (cart) => {
    const items = cart.items.map((i) => i.toObject());
    const item = items.find((i) => i._id.toString() === itemId);
    if (!item) throw new ApiError(404, 'Cart item not found');
    item.quantity = quantity;
    return items;
  });
  ok(res, await buildCartResponse(updated));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const updated = await mutateCart(req.userId, (cart) =>
    cart.items.map((i) => i.toObject()).filter((i) => i._id.toString() !== itemId)
  );
  ok(res, await buildCartResponse(updated));
});

const saveForLater = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const updated = await mutateCart(req.userId, (cart) => {
    const items = cart.items.map((i) => i.toObject());
    const item = items.find((i) => i._id.toString() === itemId);
    if (!item) throw new ApiError(404, 'Cart item not found');
    item.savedForLater = true;
    return items;
  });
  ok(res, await buildCartResponse(updated));
});

const moveToCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const updated = await mutateCart(req.userId, (cart) => {
    const items = cart.items.map((i) => i.toObject());
    const item = items.find((i) => i._id.toString() === itemId);
    if (!item) throw new ApiError(404, 'Cart item not found');
    item.savedForLater = false;
    return items;
  });
  ok(res, await buildCartResponse(updated));
});

const validateCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) return ok(res, { canCheckout: false, issues: [], items: [] });
  const { items } = await buildCartResponse(cart);
  const issues = items.filter((i) => i.issue);
  ok(res, { canCheckout: issues.length === 0 && items.length > 0, issues, items });
});

/**
 * Adds a batch of items (in the shape stored on an Order: {product, variant,
 * quantity}) to the user's cart in one mutation, skipping anything that's
 * no longer available/in stock. Used by reorder so "buy it again" gets the
 * exact same dedupe/concurrency guarantees as a normal add-to-cart.
 */
async function addItemsToCart(userId, orderItems) {
  const skipped = [];
  const toAdd = [];

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      skipped.push({ productId: item.product.toString(), reason: 'no_longer_available' });
      continue;
    }

    let availableStock = product.stock;
    let priceNow = product.price;
    if (product.hasVariants) {
      const variantDoc = product.findVariant(item.variant?.size, item.variant?.color);
      if (!variantDoc) {
        skipped.push({ productId: item.product.toString(), reason: 'variant_unavailable' });
        continue;
      }
      availableStock = variantDoc.stock;
      priceNow = product.price + variantDoc.priceModifier;
    }
    if (availableStock < 1) {
      skipped.push({ productId: item.product.toString(), reason: 'out_of_stock' });
      continue;
    }

    toAdd.push({
      product: item.product,
      variant: item.variant || {},
      quantity: Math.min(item.quantity, availableStock),
      priceAtAdd: priceNow,
    });
  }

  if (toAdd.length) {
    await mutateCart(userId, (cart) => {
      const items = [...cart.items];
      for (const newItem of toAdd) {
        const existingIdx = items.findIndex(
          (i) =>
            i.product.toString() === newItem.product.toString() &&
            !i.savedForLater &&
            sameVariant(i.variant, newItem.variant)
        );
        if (existingIdx >= 0) {
          items[existingIdx] = {
            ...items[existingIdx].toObject(),
            quantity: items[existingIdx].quantity + newItem.quantity,
          };
        } else {
          items.push({ ...newItem, savedForLater: false });
        }
      }
      return items;
    });
  }

  return { added: toAdd.length, skipped };
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  saveForLater,
  moveToCart,
  validateCart,
  buildCartResponse,
  addItemsToCart,
};
