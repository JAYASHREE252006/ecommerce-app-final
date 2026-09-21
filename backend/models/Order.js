const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'refunded',
];

const PURCHASED_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'return_requested'];
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];
const RETURNABLE_STATUSES = ['delivered'];
const PAYMENT_METHODS = ['card', 'upi', 'netbanking', 'wallet', 'cod'];

const variantSelectionSchema = new mongoose.Schema(
  { size: { type: String, default: null }, color: { type: String, default: null } },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: variantSelectionSchema, default: () => ({}) },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true },
  },
  { _id: false }
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    invoiceNumber: { type: String, unique: true, sparse: true, index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    cancellationReason: { type: String, default: null },
    returnReason: { type: String, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, 'items.product': 1, status: 1 });
orderSchema.index({ user: 1, status: 1, createdAt: -1 });

orderSchema.pre('save', function assignInvoiceNumber(next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const shortId = this._id.toString().slice(-8).toUpperCase();
    this.invoiceNumber = `INV-${year}-${shortId}`;
  }
  if (this.isNew && !this.statusHistory.length) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PURCHASED_STATUSES = PURCHASED_STATUSES;
orderSchema.statics.CANCELLABLE_STATUSES = CANCELLABLE_STATUSES;
orderSchema.statics.RETURNABLE_STATUSES = RETURNABLE_STATUSES;
orderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;

module.exports = mongoose.model('Order', orderSchema);
