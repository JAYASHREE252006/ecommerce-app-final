const ProductActivity = require('../models/ProductActivity');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');
const { asyncHandler, ok } = require('../utils/apiHelpers');
const { PUBLIC_FIELDS } = require('./productController');

const RECOMMENDATION_LIMIT = 12;
const BROWSING_SIGNAL_LIMIT = 50;
const TRENDING_CACHE_TTL_MS = 10 * 60 * 1000;

let trendingCache = { computedAt: 0, products: [] };

function serializeProduct(product) {
  return {
    id: product._id,
    name: product.name,
    images: product.images,
    price: product.price,
    originalPrice: product.originalPrice,
    discountPercent:
      product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0,
    category: product.category,
    brand: product.brand,
    rating: product.rating,
    availability:
      product.isActive && (product.hasVariants ? product.totalStock : product.stock) > 0
        ? 'in_stock'
        : 'out_of_stock',
  };
}

async function getTrendingProducts(limit = RECOMMENDATION_LIMIT) {
  const now = Date.now();
  if (now - trendingCache.computedAt < TRENDING_CACHE_TTL_MS && trendingCache.products.length) {
    return trendingCache.products.slice(0, limit);
  }

  const bestSellers = await Order.aggregate([
    { $match: { status: { $in: Order.PURCHASED_STATUSES } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', unitsSold: { $sum: '$items.quantity' } } },
    { $sort: { unitsSold: -1 } },
    { $limit: 30 },
  ]);

  let productIds = bestSellers.map((b) => b._id);
  let products = [];

  if (productIds.length) {
    const found = await Product.find({ _id: { $in: productIds }, isActive: true });
    const byId = new Map(found.map((p) => [p._id.toString(), p]));
    products = productIds.map((id) => byId.get(id.toString())).filter(Boolean);
  }

  if (products.length < limit) {
    const exclude = products.map((p) => p._id);
    const popular = await Product.find({ _id: { $nin: exclude }, isActive: true })
      .sort({ ratingCount: -1, rating: -1 })
      .limit(limit - products.length + 10);
    products = products.concat(popular);
  }

  const inStock = products.filter((p) => (p.hasVariants ? p.totalStock : p.stock) > 0);
  trendingCache = { computedAt: now, products: inStock.map(serializeProduct) };
  return trendingCache.products.slice(0, limit);
}

const getTrending = asyncHandler(async (req, res) => {
  const products = await getTrendingProducts(RECOMMENDATION_LIMIT);
  ok(res, { products });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const [recentActivity, wishlist, orders] = await Promise.all([
    ProductActivity.find({ user: req.userId, activityType: 'viewed' })
      .sort({ viewedAt: -1 })
      .limit(BROWSING_SIGNAL_LIMIT)
      .populate('product', 'category brand')
      .lean(),
    Wishlist.findOne({ user: req.userId }).populate('products', 'category brand').lean(),
    Order.find({ user: req.userId, status: { $in: Order.PURCHASED_STATUSES } })
      .populate('items.product', 'category brand')
      .lean(),
  ]);

  const categoryScore = new Map();
  const bump = (category, weight) => {
    if (!category) return;
    categoryScore.set(category, (categoryScore.get(category) || 0) + weight);
  };

  const purchasedProductIds = new Set();

  recentActivity.forEach((a) => a.product && bump(a.product.category, 1));
  (wishlist?.products || []).forEach((p) => bump(p.category, 2));
  orders.forEach((order) =>
    order.items.forEach((item) => {
      if (item.product) {
        bump(item.product.category, 1);
        purchasedProductIds.add(item.product._id.toString());
      }
    })
  );

  const topCategories = [...categoryScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category]) => category);

  let recommended = [];

  if (topCategories.length) {
    const candidates = await Product.find({
      category: { $in: topCategories },
      isActive: true,
      _id: { $nin: [...purchasedProductIds] },
    })
      .sort({ rating: -1, ratingCount: -1 })
      .limit(RECOMMENDATION_LIMIT * 2);

    recommended = candidates
      .filter((p) => (p.hasVariants ? p.totalStock : p.stock) > 0)
      .slice(0, RECOMMENDATION_LIMIT)
      .map(serializeProduct);
  }

  if (recommended.length < RECOMMENDATION_LIMIT) {
    const have = new Set(recommended.map((p) => p.id.toString()));
    const trending = await getTrendingProducts(RECOMMENDATION_LIMIT * 2);
    for (const p of trending) {
      if (recommended.length >= RECOMMENDATION_LIMIT) break;
      if (have.has(p.id.toString()) || purchasedProductIds.has(p.id.toString())) continue;
      recommended.push(p);
      have.add(p.id.toString());
    }
  }

  ok(res, { products: recommended, basedOn: topCategories });
});

module.exports = { getTrending, getRecommendations };
