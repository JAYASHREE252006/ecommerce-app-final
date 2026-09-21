const mongoose = require('mongoose');

/**
 * An immutable audit log of every payment webhook event received, regardless
 * of provider. Two jobs:
 *  1. Idempotency: `eventId` (the provider's own unique event/delivery id)
 *     has a unique index, so processing the same webhook delivery twice
 *     (which every payment provider's docs warn WILL happen sometimes) is a
 *     harmless duplicate-key error on the second attempt, not a duplicate
 *     order/refund.
 *  2. Auditing: the raw payload is kept as-received so a payment dispute or
 *     bug investigation has a ground-truth record independent of whatever
 *     the Order document was mutated to afterwards.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true }, // e.g. 'razorpay', 'stripe'
    eventId: { type: String, required: true },
    eventType: { type: String, required: true }, // e.g. 'payment.captured'
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
