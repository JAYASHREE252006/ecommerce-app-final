const mongoose = require('mongoose');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');
const { sendPushToUsers } = require('../utils/pushNotificationService');

const PUBLIC_FIELDS =
  'name description images price originalPrice category brand rating ratingCount stock variants isActive createdAt';

const listProducts = asyncHandler(async (req, res) => {
  const { category, brand, search, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const [products, total] = await Promise.all([
    Product.find(filter, PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  ok(res, { products, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
});

const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }
  const product = await Product.findOne({ _id: productId, isActive: true }, PUBLIC_FIELDS);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  ok(res, { product });
});

/**
 * PATCH /api/products/:productId/admin-update - DEMO ONLY stand-in for a
 * real admin panel/product-management system (which doesn't exist yet).
 * Lets you change a product's price/stock to demonstrate the price-drop
 * and back-in-stock notification triggers without building full admin
 * tooling. Any authenticated user can call it for now - lock this down to
 * an actual admin role before using this in a real deployment.
 */
const adminUpdateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, 'Invalid product id');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const previousPrice = product.price;
  const previousStock = product.hasVariants ? product.totalStock : product.stock;

  if (req.body.price !== undefined) product.price = req.body.price;
  if (req.body.stock !== undefined && !product.hasVariants) product.stock = req.body.stock;
  await product.save();

  const newStock = product.hasVariants ? product.totalStock : product.stock;
  const priceDropped = product.price < previousPrice;
  const backInStock = previousStock === 0 && newStock > 0;

  if (priceDropped || backInStock) {
    const wishlist = await Wishlist.find({ products: productId }).select('user');
    const userIds = wishlist.map((w) => w.user);
    if (userIds.length) {
      if (priceDropped) {
        sendPushToUsers(
          userIds,
          'price_drop',
          'Price drop!',
          `${product.name} is now Rs.${product.price} (was Rs.${previousPrice}).`,
          { productId: product._id.toString() }
        ).catch((err) => console.warn('[productController] price_drop push failed', err));
      }
      if (backInStock) {
        sendPushToUsers(
          userIds,
          'back_in_stock',
          'Back in stock!',
          `${product.name} is available again.`,
          { productId: product._id.toString() }
        ).catch((err) => console.warn('[productController] back_in_stock push failed', err));
      }
    }
  }

  ok(res, { product });
});

module.exports = { listProducts, getProduct, adminUpdateProduct, PUBLIC_FIELDS };
