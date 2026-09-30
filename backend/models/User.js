const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    // Per-category opt-in/out, all enabled by default. Any category not
    // present in this map defaults to enabled - see notificationService's
    // isCategoryEnabled helper.
    notificationPreferences: {
      order_confirmation: { type: Boolean, default: true },
      payment_update: { type: Boolean, default: true },
      shipping_update: { type: Boolean, default: true },
      delivery_update: { type: Boolean, default: true },
      price_drop: { type: Boolean, default: true },
      back_in_stock: { type: Boolean, default: true },
      abandoned_cart: { type: Boolean, default: true },
      promotion: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    themePreference: this.themePreference,
    notificationPreferences: this.notificationPreferences,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
