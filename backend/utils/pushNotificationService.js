const DeviceToken = require('../models/DeviceToken');
const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isCategoryEnabled(user, category) {
  // Default to enabled if the field is somehow missing (e.g. an account
  // created before this feature existed and never re-saved).
  return user.notificationPreferences?.[category] !== false;
}

/**
 * Sends a push notification to every device registered for one user,
 * respecting their per-category preference, and logs the outcome either
 * way (spec: "every notification sent should be logged with its delivery
 * status"). Automatically de-registers any device token Expo reports as
 * no longer valid, so a stale token never gets retried forever.
 */
async function sendPushToUser(userId, category, title, body, data = {}) {
  const user = await User.findById(userId);
  if (!user) return;

  if (!isCategoryEnabled(user, category)) {
    await NotificationLog.create({ user: userId, category, title, body, data, deliveryStatus: 'skipped_preference' });
    return;
  }

  const devices = await DeviceToken.find({ user: userId });
  if (!devices.length) {
    await NotificationLog.create({ user: userId, category, title, body, data, deliveryStatus: 'skipped_no_device' });
    return;
  }

  const messages = devices.map((d) => ({
    to: d.token,
    sound: 'default',
    title,
    body,
    data: { category, ...data },
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    const tickets = Array.isArray(result.data) ? result.data : [];

    // Expo tells us per-message if a token is dead (app uninstalled etc) -
    // clean those up immediately instead of retrying them forever.
    await Promise.all(
      tickets.map(async (ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await DeviceToken.deleteOne({ token: devices[idx].token });
        }
      })
    );

    await NotificationLog.create({ user: userId, category, title, body, data, deliveryStatus: 'sent' });
  } catch (err) {
    await NotificationLog.create({
      user: userId,
      category,
      title,
      body,
      data,
      deliveryStatus: 'failed',
      errorMessage: err.message,
    });
  }
}

async function sendPushToUsers(userIds, category, title, body, data = {}) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, category, title, body, data)));
}

module.exports = { sendPushToUser, sendPushToUsers, isCategoryEnabled };
