const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    category: { type: String, index: true },
    brand: { type: String, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

productSchema.virtual('availability').get(function availability() {
  return this.isActive && this.stock > 0 ? 'in_stock' : 'out_of_stock';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
