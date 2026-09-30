const mongoose = require('mongoose');

/**
 * One document per (user, device). A user can have multiple devices
 * (phone + tablet), each with its own Expo push token. `token` is unique
 * on its own too - if the same physical device token somehow gets
 * registered under two users (e.g. shared device, different accounts
 * logging in), the newer registration wins and the old one is removed,
 * so a push never accidentally goes to the wrong (previous) user.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'unknown'], default: 'unknown' },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
