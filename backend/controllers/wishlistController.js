const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.userId }).populate(
    'products',
    'name images price stock isActive rating'
  );
  ok(res, { products: wishlist?.products || [] });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }
  const product = await Product.findById(productId).select('_id');
  if (!product) throw new ApiError(404, 'Product not found');

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.userId },
    { $addToSet: { products: productId } },
    { upsert: true, new: true }
  );
  ok(res, { products: wishlist.products });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.userId },
    { $pull: { products: productId } },
    { new: true }
  );
  ok(res, { products: wishlist?.products || [] });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
