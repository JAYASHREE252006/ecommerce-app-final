const mongoose = require('mongoose');

/**
 * One document per (user, product, activityType).
 * "viewed" is the only activityType today but the shape leaves room for
 * future activity types (e.g. "searched") without a schema migration.
 *
 * Why this shape instead of one big array field on User:
 * - Upserting a single small document avoids loading/rewriting a whole
 *   array on every view (which gets expensive as history grows and risks
 *   lost updates under concurrent writes).
 * - MongoDB can do the "keep only latest 20" trim with a query + bulk
 *   delete instead of application-side array surgery.
 * - Per-document upsert + unique index gives us duplicate-prevention and
 *   race-condition safety for free (see routes note on findOneAndUpdate).
 */
const productActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    activityType: { type: String, enum: ['viewed'], default: 'viewed' },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevents duplicate "active" records for the same user+product+activityType.
// Every view of an already-tracked product becomes an UPDATE (upsert) of
// this one document's viewedAt, never a new row -> "unique products only".
productActivitySchema.index({ user: 1, product: 1, activityType: 1 }, { unique: true });

// Powers: "give me this user's most-recently-viewed products, newest first"
// and the "keep only latest 20, delete the rest" trim query. Sorting on
// viewedAt with an equality match on user+activityType is fully covered
// by this compound index (no in-memory sort).
productActivitySchema.index({ user: 1, activityType: 1, viewedAt: -1 });

module.exports = mongoose.model('ProductActivity', productActivitySchema);
