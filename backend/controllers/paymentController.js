const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PaymentEvent = require('../models/PaymentEvent');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');

/**
 * Verifies the webhook actually came from the payment provider using HMAC:
 * the provider signs the raw request body with a shared secret, and we
 * recompute the same signature here. Never trust a webhook payload without
 * this check - anyone could otherwise POST a fake "payment succeeded" event.
 *
 * This function's exact header name / algorithm is generic on purpose since
 * no real provider is connected yet. Swap `x-webhook-signature` and the
 * hashing details for whatever your chosen provider's docs specify
 * (Razorpay: 'x-razorpay-signature', Stripe: 'stripe-signature' with a
 * slightly different scheme) - the surrounding idempotency/audit logic
 * stays the same regardless of provider.
 */
function isValidSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !process.env.PAYMENT_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  // timingSafeEqual requires equal-length buffers, so length-check first.
  const expectedBuf = Buffer.from(expected, 'utf8');
  const givenBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

/**
 * POST /api/payments/webhook - called by the payment provider, not the
 * frontend. Body arrives as a raw Buffer (see app.js) so the signature can
 * be verified over the exact bytes sent.
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body; // Buffer, thanks to express.raw() in app.js

  if (!isValidSignature(rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new ApiError(400, 'Malformed webhook payload');
  }

  const { eventId, type: eventType, data } = payload;
  if (!eventId || !eventType) {
    throw new ApiError(400, 'Webhook payload missing eventId or type');
  }

  // Idempotency: the unique index on (provider, eventId) makes a duplicate
  // delivery a harmless no-op instead of double-processing a payment.
  try {
    await PaymentEvent.create({
      provider: payload.provider || 'generic',
      eventId,
      eventType,
      order: data?.orderId || null,
      payload,
    });
  } catch (err) {
    if (err.code === 11000) {
      return ok(res, { received: true, duplicate: true });
    }
    throw err;
  }

  if (data?.orderId) {
    const order = await Order.findById(data.orderId);
    if (order) {
      if (eventType === 'payment.captured' && order.status === 'pending') {
        order.status = 'confirmed';
        order.statusHistory.push({ status: 'confirmed', changedAt: new Date(), note: 'Payment captured' });
        await order.save();
      } else if (eventType === 'payment.failed' && order.status === 'pending') {
        // Payment never went through - release the stock that was reserved at checkout.
        for (const item of order.items) {
          // eslint-disable-next-line no-await-in-loop
          const product = await Product.findById(item.product);
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
          // eslint-disable-next-line no-await-in-loop
          await product.save();
        }
        order.status = 'cancelled';
        order.cancellationReason = 'Payment failed';
        order.statusHistory.push({ status: 'cancelled', changedAt: new Date(), note: 'Payment failed' });
        await order.save();
      }
    }
  }

  ok(res, { received: true });
});

module.exports = { handleWebhook };
