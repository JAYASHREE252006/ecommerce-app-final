const mongoose = require('mongoose');

// Every category a notification can belong to - used both for sending and
// for the per-user preference toggles that gate each category.
const NOTIFICATION_CATEGORIES = [
  'order_confirmation',
  'payment_update',
  'shipping_update',
  'delivery_update',
  'price_drop',
  'back_in_stock',
  'abandoned_cart',
  'promotion',
];

/**
 * An audit record of every notification the backend attempted to send,
 * regardless of whether it actually reached the device. Lets a support
 * investigation or the person themselves answer "did I get notified about
 * X" without relying on device-side history, which the backend can't see.
 */
const notificationLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped_preference', 'skipped_no_device'],
      required: true,
    },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

notificationLogSchema.index({ user: 1, createdAt: -1 });
notificationLogSchema.statics.NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES;

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
