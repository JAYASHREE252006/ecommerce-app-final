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
    priceAtAdd: { type: Number, required: true },
    savedForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
