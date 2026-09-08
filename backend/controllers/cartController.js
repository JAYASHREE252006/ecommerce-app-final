const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId }).populate(
    'items.product',
    'name images price stock isActive'
  );
  ok(res, { items: cart?.items || [] });
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }
  if (product.stock < 1) {
    throw new ApiError(409, 'Product is out of stock');
  }

  let cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    cart = await Cart.create({ user: req.userId, items: [] });
  }

  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }
  await cart.save();

  ok(res, { items: cart.items });
});

const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.userId });
  if (cart) {
    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    await cart.save();
  }
  ok(res, { items: cart?.items || [] });
});

module.exports = { getCart, addToCart, removeFromCart };
