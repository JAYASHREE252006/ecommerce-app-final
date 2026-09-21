const mongoose = require('mongoose');

const productActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    activityType: { type: String, enum: ['viewed'], default: 'viewed' },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

productActivitySchema.index({ user: 1, product: 1, activityType: 1 }, { unique: true });
productActivitySchema.index({ user: 1, activityType: 1, viewedAt: -1 });

module.exports = mongoose.model('ProductActivity', productActivitySchema);
