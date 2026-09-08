const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

/** Creates an order from the user's current cart, then empties the cart. */
const createOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId }).populate('items.product', 'price');
  if (!cart || !cart.items.length) {
    throw new ApiError(400, 'Cart is empty');
  }

  const items = cart.items.map((i) => ({
    product: i.product._id,
    quantity: i.quantity,
    priceAtPurchase: i.product.price,
  }));
  const totalAmount = items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

  const order = await Order.create({
    user: req.userId,
    items,
    totalAmount,
    status: 'confirmed',
  });

  cart.items = [];
  await cart.save();

  ok(res, { order }, 201);
});

const listOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images');
  ok(res, { orders });
});

/** Demo/admin helper to move an order through its lifecycle (delivered, cancelled, etc). */
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
