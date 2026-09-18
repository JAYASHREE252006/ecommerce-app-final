const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

/**
 * Checkout. Runs inside a MongoDB transaction because it touches multiple
 * documents that must all succeed or all fail together: decrementing stock
 * on N different products/variants, creating the Order, and clearing the
 * purchased items out of the Cart. Without a transaction, a crash between
 * steps could charge stock without creating an order, or vice versa.
 * Requires MongoDB Atlas (or any replica set) - the free M0 tier qualifies.
 */
const createOrder = asyncHandler(async (req, res) => {
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
        // Re-validate everything with a fresh read INSIDE the transaction -
        // the cart may have been sitting for a while since it was last checked.
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.isActive) {
          throw new ApiError(409, `A product in your cart is no longer available`);
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
          orderItems.push({ product: product._id, quantity: item.quantity, priceAtPurchase: priceNow });
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

      const createdOrders = await Order.create(
        [{ user: req.userId, items: orderItems, totalAmount, status: 'confirmed' }],
        { session }
      );
      order = createdOrders[0];

      // Remove only the purchased (non-saved-for-later) items; anything the
      // user explicitly saved for later stays in their cart untouched.
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

const listOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images');
  ok(res, { orders });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Order.ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${Order.ORDER_STATUSES.join(', ')}`);
  }

  const order = await Order.findOneAndUpdate(
    { _id: req.params.orderId, user: req.userId },
    { status },
    { new: true }
  );
  if (!order) throw new ApiError(404, 'Order not found');

  ok(res, { order });
});

module.exports = { createOrder, listOrders, updateOrderStatus };
