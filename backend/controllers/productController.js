const mongoose = require('mongoose');
const Product = require('../models/Product');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

// Fields the frontend actually needs for cards/listings - keeps payloads small
// and avoids leaking internal-only fields.
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

module.exports = { listProducts, getProduct, PUBLIC_FIELDS };
