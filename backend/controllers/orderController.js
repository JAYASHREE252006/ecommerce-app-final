const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');
const { generateInvoicePdf } = require('../utils/generateInvoicePdf');

/**
 * Checkout. Runs inside a MongoDB transaction: decrementing stock on N
 * different products/variants, creating the Order, and clearing the
 * purchased items out of the Cart must all succeed or all fail together.
 * Requires a replica set (Atlas free tier qualifies).
 *
 * paymentMethod drives the initial status: COD orders are confirmed
 * immediately (nothing to wait on), while online-payment methods start
 * 'pending' until the payment webhook confirms the charge actually went
 * through (see paymentController.handleWebhook).
 */
const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod = 'cod' } = req.body;
  if (!Order.PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, `paymentMethod must be one of: ${Order.PAYMENT_METHODS.join(', ')}`);
  }

  const cart = await Cart.findOne({ user: req.userId });
  const toCheckout = (cart?.items || []).filter((i) => !i.savedForLater);
  if (!toCheckout.length) {
    throw new ApiError(400, 'Cart is empty');
  }

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let totalAmount = 0;

      for (const item of toCheckout) {
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.isActive) {
          throw new ApiError(409, 'A product in your cart is no longer available');
        }

        if (product.hasVariants) {
          const variantDoc = product.variants.find(
            (v) =>
              (v.size || null) === (item.variant?.size || null) &&
              (v.color || null) === (item.variant?.color || null)
          );
          if (!variantDoc || variantDoc.stock < item.quantity) {
            throw new ApiError(409, `${product.name} (selected variant) is out of stock`);
          }
          variantDoc.stock -= item.quantity;
          const priceNow = product.price + variantDoc.priceModifier;
          orderItems.push({
            product: product._id,
            variant: item.variant,
            quantity: item.quantity,
            priceAtPurchase: priceNow,
          });
          totalAmount += priceNow * item.quantity;
        } else {
          if (product.stock < item.quantity) {
            throw new ApiError(409, `${product.name} is out of stock`);
          }
          product.stock -= item.quantity;
          orderItems.push({ product: product._id, quantity: item.quantity, priceAtPurchase: product.price });
          totalAmount += product.price * item.quantity;
        }

        await product.save({ session });
      }

      const initialStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

      const createdOrders = await Order.create(
        [{ user: req.userId, items: orderItems, totalAmount, status: initialStatus, paymentMethod }],
        { session }
      );
      order = createdOrders[0];

      await Cart.updateOne(
        { user: req.userId },
        { $pull: { items: { savedForLater: false } }, $inc: { version: 1 } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  ok(res, { order }, 201);
});

/**
 * GET /api/orders - Order History with server-side pagination, sorting,
 * and filtering. All filtering/sorting happens in the query itself
 * (compound index on user+status+createdAt), never in application memory.
 */
const listOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentMethod,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  const filter = { user: req.userId };
  if (status) {
    if (!Order.ORDER_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status filter');
    filter.status = status;
  }
  if (paymentMethod) {
    if (!Order.PAYMENT_METHODS.includes(paymentMethod)) throw new ApiError(400, 'Invalid paymentMethod filter');
    filter.paymentMethod = paymentMethod;
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const sortField = ['createdAt', 'totalAmount'].includes(sortBy) ? sortBy : 'createdAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('items.product', 'name images'),
    Order.countDocuments(filter),
  ]);

  ok(res, { orders, page: pageNum, totalPages: Math.ceil(total / limitNum), total });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId }).populate(
    'items.product',
    'name images price'
  );
  if (!order) throw new ApiError(404, 'Order not found');
  ok(res, { order });
});

/** PATCH /api/orders/:orderId/status - demo/admin helper; also used internally by the webhook handler. */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!Order.ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${Order.ORDER_STATUSES.join(', ')}`);
  }
  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId });
  if (!order) throw new ApiError(404, 'Order not found');

  order.status = status;
  order.statusHistory.push({ status, changedAt: new Date(), note: note || null });
  await order.save();

  ok(res, { order });
});

/** PATCH /api/orders/:orderId/cancel - only while the order hasn't shipped yet. Restocks products. */
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId }).populate('items.product');
  if (!order) throw new ApiError(404, 'Order not found');
  if (!Order.CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, `Order in status '${order.status}' can no longer be cancelled`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        const product = await Product.findById(item.product._id || item.product).session(session);
        if (!product) continue;
        if (product.hasVariants) {
          const variantDoc = product.variants.find(
            (v) =>
              (v.size || null) === (item.variant?.size || null) &&
              (v.color || null) === (item.variant?.color || null)
          );
          if (variantDoc) variantDoc.stock += item.quantity;
        } else {
          product.stock += item.quantity;
        }
        await product.save({ session });
      }

      order.status = 'cancelled';
      order.cancellationReason = reason || null;
      order.statusHistory.push({ status: 'cancelled', changedAt: new Date(), note: reason || null });
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  ok(res, { order });
});

/** PATCH /api/orders/:orderId/return - only once delivered. Does not restock yet - that happens when the return is actually received/refunded (a separate status transition). */
const requestReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!Order.RETURNABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, `Order in status '${order.status}' is not eligible for return`);
  }

  order.status = 'return_requested';
  order.returnReason = reason || null;
  order.statusHistory.push({ status: 'return_requested', changedAt: new Date(), note: reason || null });
  await order.save();

  ok(res, { order });
});

/** POST /api/orders/:orderId/reorder - adds this order's items back to the cart at current price/stock. */
const reorder = asyncHandler(async (req, res) => {
  const { addItemsToCart } = require('./cartController');

  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId });
  if (!order) throw new ApiError(404, 'Order not found');

  const { added, skipped } = await addItemsToCart(req.userId, order.items);
  ok(res, { added, skipped });
});

/** GET /api/orders/:orderId/invoice - streams a generated PDF invoice. */
const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.userId })
    .populate('items.product', 'name')
    .populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber}.pdf"`);
  generateInvoicePdf(order, req.user, res);
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  reorder,
  downloadInvoice,
};
