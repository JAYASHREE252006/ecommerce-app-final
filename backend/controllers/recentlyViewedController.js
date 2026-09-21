const mongoose = require('mongoose');
const ProductActivity = require('../models/ProductActivity');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');
const { PUBLIC_FIELDS } = require('./productController');
const { emitToUser } = require('../sockets');

const MAX_RECENTLY_VIEWED = parseInt(process.env.RECENTLY_VIEWED_MAX, 10) || 20;
const MAX_CONTINUE_SHOPPING = parseInt(process.env.CONTINUE_SHOPPING_MAX, 10) || 10;
const BROWSING_HISTORY_MAX = parseInt(process.env.BROWSING_HISTORY_MAX, 10) || 50;

async function trimToLimit(userId) {
  const overflow = await ProductActivity.find({ user: userId, activityType: 'viewed' })
    .sort({ viewedAt: -1 })
    .skip(BROWSING_HISTORY_MAX)
    .select('_id');
  if (overflow.length) {
    await ProductActivity.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
  }
}

async function buildRecentlyViewedList(userId, limit = MAX_RECENTLY_VIEWED) {
  const activities = await ProductActivity.find({ user: userId, activityType: 'viewed' })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .populate('product', PUBLIC_FIELDS)
    .lean();

  const valid = activities.filter((a) => a.product);

  const [wishlist, cart] = await Promise.all([
    Wishlist.findOne({ user: userId }).select('products').lean(),
    Cart.findOne({ user: userId }).select('items').lean(),
  ]);
  const wishlistSet = new Set((wishlist?.products || []).map((id) => id.toString()));
  const cartSet = new Set((cart?.items || []).filter((i) => !i.savedForLater).map((i) => i.product.toString()));

  return valid.map((a) => ({
    id: a.product._id,
    name: a.product.name,
    images: a.product.images,
    price: a.product.price,
    originalPrice: a.product.originalPrice,
    discountPercent: a.product.originalPrice > a.product.price
      ? Math.round(((a.product.originalPrice - a.product.price) / a.product.originalPrice) * 100)
      : 0,
    category: a.product.category,
    brand: a.product.brand,
    rating: a.product.rating,
    availability: a.product.isActive && a.product.stock > 0 ? 'in_stock' : 'out_of_stock',
    isWishlisted: wishlistSet.has(a.product._id.toString()),
    isInCart: cartSet.has(a.product._id.toString()),
    viewedAt: a.viewedAt,
  }));
}

const recordView = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }
  const product = await Product.findById(productId).select('_id isActive');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (!req.userId) {
    return ok(res, { tracked: 'local' });
  }

  await ProductActivity.findOneAndUpdate(
    { user: req.userId, product: productId, activityType: 'viewed' },
    { $set: { viewedAt: new Date() } },
    { upsert: true, new: true }
  );

  await trimToLimit(req.userId);

  const items = await buildRecentlyViewedList(req.userId);
  emitToUser(req.userId, 'recentlyViewedUpdated', { userId: req.userId, items });

  ok(res, { tracked: 'server', items });
});

const getRecentlyViewed = asyncHandler(async (req, res) => {
  const items = await buildRecentlyViewedList(req.userId);
  ok(res, { items });
});

const syncRecentlyViewed = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    throw new ApiError(400, 'items must be an array');
  }
  const validItems = items.filter((it) => it && mongoose.isValidObjectId(it.productId) && it.viewedAt);

  if (validItems.length) {
    const existingIds = new Set(
      (await Product.find({ _id: { $in: validItems.map((i) => i.productId) } }).select('_id')).map((p) =>
        p._id.toString()
      )
    );
    const ops = validItems
      .filter((it) => existingIds.has(it.productId))
      .map((it) => ({
        updateOne: {
          filter: { user: req.userId, product: it.productId, activityType: 'viewed' },
          update: { $max: { viewedAt: new Date(it.viewedAt) } },
          upsert: true,
        },
      }));
    if (ops.length) {
      await ProductActivity.bulkWrite(ops, { ordered: false });
    }
  }

  await trimToLimit(req.userId);

  const canonicalItems = await buildRecentlyViewedList(req.userId);
  emitToUser(req.userId, 'recentlyViewedUpdated', { userId: req.userId, items: canonicalItems });
  ok(res, { items: canonicalItems });
});

const getContinueShopping = asyncHandler(async (req, res) => {
  const activities = await ProductActivity.find({ user: req.userId, activityType: 'viewed' })
    .sort({ viewedAt: -1 })
    .populate('product', PUBLIC_FIELDS)
    .lean();

  const viewedProductIds = activities.filter((a) => a.product).map((a) => a.product._id);
  if (!viewedProductIds.length) {
    return ok(res, { items: [] });
  }

  const purchasedIds = await Order.aggregate([
    { $match: { user: req.userId, status: { $in: Order.PURCHASED_STATUSES } } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $in: viewedProductIds } } },
    { $group: { _id: '$items.product' } },
  ]);
  const purchasedSet = new Set(purchasedIds.map((p) => p._id.toString()));

  const [wishlist, cart] = await Promise.all([
    Wishlist.findOne({ user: req.userId }).select('products').lean(),
    Cart.findOne({ user: req.userId }).select('items').lean(),
  ]);
  const wishlistSet = new Set((wishlist?.products || []).map((id) => id.toString()));
  const cartSet = new Set((cart?.items || []).filter((i) => !i.savedForLater).map((i) => i.product.toString()));

  const items = activities
    .filter((a) => a.product && !purchasedSet.has(a.product._id.toString()))
    .slice(0, MAX_CONTINUE_SHOPPING)
    .map((a) => ({
      id: a.product._id,
      name: a.product.name,
      images: a.product.images,
      price: a.product.price,
      originalPrice: a.product.originalPrice,
      category: a.product.category,
      brand: a.product.brand,
      rating: a.product.rating,
      availability: a.product.isActive && a.product.stock > 0 ? 'in_stock' : 'out_of_stock',
      isWishlisted: wishlistSet.has(a.product._id.toString()),
      isInCart: cartSet.has(a.product._id.toString()),
      viewedAt: a.viewedAt,
    }));

  ok(res, { items });
});

module.exports = {
  recordView,
  getRecentlyViewed,
  syncRecentlyViewed,
  getContinueShopping,
  buildRecentlyViewedList,
  MAX_RECENTLY_VIEWED,
};
