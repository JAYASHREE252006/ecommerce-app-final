const mongoose = require('mongoose');

// Explicit, single source of truth for order status values used across the app.
// "Purchased" (for Continue Shopping exclusion) = any status EXCEPT 'cancelled' and 'refunded'.
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

// Statuses that count as a genuine purchase (product should be excluded from Continue Shopping)
const PURCHASED_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
  },
  { timestamps: true }
);

// Speeds up "has this user purchased product X" lookups used by Continue Shopping.
orderSchema.index({ user: 1, 'items.product': 1, status: 1 });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PURCHASED_STATUSES = PURCHASED_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
