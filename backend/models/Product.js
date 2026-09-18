const mongoose = require('mongoose');

// A product WITHOUT variants uses the top-level `stock` field directly.
// A product WITH variants (e.g. size/color) tracks stock per-variant instead;
// top-level `stock` is then ignored in favor of the sum of variant stocks.
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, default: null },
    color: { type: String, default: null },
    sku: { type: String, default: null },
    stock: { type: Number, default: 0, min: 0 },
    priceModifier: { type: Number, default: 0 }, // added to base price, can be negative
  },
  { _id: true }
);

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
    variants: { type: [variantSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual('hasVariants').get(function hasVariants() {
  return this.variants && this.variants.length > 0;
});

/** Total sellable stock regardless of whether the product uses variants. */
productSchema.virtual('totalStock').get(function totalStock() {
  if (this.hasVariants) {
    return this.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return this.stock;
});

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

productSchema.virtual('availability').get(function availability() {
  return this.isActive && this.totalStock > 0 ? 'in_stock' : 'out_of_stock';
});

/** Finds a specific variant by size+color, or null if the product has no variants / no match. */
productSchema.methods.findVariant = function findVariant(size, color) {
  if (!this.hasVariants) return null;
  return (
    this.variants.find(
      (v) => (v.size || null) === (size || null) && (v.color || null) === (color || null)
    ) || null
  );
};

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
