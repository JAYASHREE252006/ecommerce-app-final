const DeviceToken = require('../models/DeviceToken');
const NotificationLog = require('../models/NotificationLog');
const { asyncHandler, ApiError, ok } = require('../utils/apiHelpers');
const { sendPushToUsers } = require('../utils/pushNotificationService');

/** POST /api/notifications/register-token - called once the app has permission + an Expo push token. */
const registerToken = asyncHandler(async (req, res) => {
  const { token, platform = 'unknown' } = req.body;
  if (!token) throw new ApiError(400, 'token is required');

  // Upsert on the token itself (not user+token): if this exact device token
  // was previously registered to a different user (device changed hands,
  // or someone logged into a different account on the same phone), this
  // reassigns it rather than leaving a stale cross-user registration.
  await DeviceToken.findOneAndUpdate(
    { token },
    { user: req.userId, platform, lastUsedAt: new Date() },
    { upsert: true }
  );

  ok(res, { registered: true });
});

/** DELETE /api/notifications/register-token - called on logout so a signed-out device stops receiving this user's pushes. */
const unregisterToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');
  await DeviceToken.deleteOne({ token, user: req.userId });
  ok(res, { unregistered: true });
});

const getPreferences = asyncHandler(async (req, res) => {
  ok(res, { preferences: req.user.notificationPreferences });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;
  if (!preferences || typeof preferences !== 'object') {
    throw new ApiError(400, 'preferences object is required');
  }
  const allowedKeys = Object.keys(req.user.notificationPreferences.toObject());
  for (const key of Object.keys(preferences)) {
    if (!allowedKeys.includes(key)) continue;
    req.user.notificationPreferences[key] = !!preferences[key];
  }
  await req.user.save();
  ok(res, { preferences: req.user.notificationPreferences });
});

/** GET /api/notifications/history - lets the user see what's been sent to them, for their own reference. */
const getHistory = asyncHandler(async (req, res) => {
  const logs = await NotificationLog.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
  ok(res, { notifications: logs });
});

/**
 * POST /api/notifications/broadcast - DEMO ONLY stand-in for a real admin
 * campaign tool. Sends a promotional push to every user who has at least
 * one registered device (their own preference toggle still applies).
 * Lock this to an actual admin role before real use.
 */
const broadcastPromotion = asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) throw new ApiError(400, 'title and body are required');

  const userIds = await DeviceToken.distinct('user');
  await sendPushToUsers(userIds, 'promotion', title, body, {});

  ok(res, { targeted: userIds.length });
});

module.exports = {
  registerToken,
  unregisterToken,
  getPreferences,
  updatePreferences,
  getHistory,
  broadcastPromotion,
};
