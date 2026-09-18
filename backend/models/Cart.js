const mongoose = require('mongoose');

const variantSelectionSchema = new mongoose.Schema(
  { size: { type: String, default: null }, color: { type: String, default: null } },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: variantSelectionSchema, default: () => ({}) },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Snapshot of the price at the moment this was added - compared against
    // the product's live price at checkout/view time to detect price changes.
    priceAtAdd: { type: Number, required: true },
    savedForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true } // each line item gets its own id so the frontend can address it directly
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    // Optimistic-concurrency version. Every mutating operation reads this,
    // computes the new items array, then writes back conditioned on the
    // version it read. If another device/tab mutated the cart in between,
    // the conditioned write matches zero documents and the caller retries -
    // this is what prevents two simultaneous devices from both "seeing" the
    // same starting state and each pushing a duplicate line item.
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
