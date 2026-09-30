const Cart = require('../models/Cart');
const { sendPushToUser } = require('./pushNotificationService');

const ABANDONED_AFTER_HOURS = parseInt(process.env.ABANDONED_CART_HOURS, 10) || 3;
const REMINDER_COOLDOWN_HOURS = 24; // don't nag more than once a day about the same cart
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // check every 30 minutes

/**
 * Finds carts with active (non-saved-for-later) items whose OLDEST item was
 * added more than ABANDONED_AFTER_HOURS ago, and that haven't already been
 * reminded within the cooldown window, then sends one push per cart.
 * `lastAbandonedReminderAt` on the Cart doc is what prevents re-notifying
 * the same abandoned cart every time this job runs.
 */
async function runAbandonedCartCheck() {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000);
  const reminderCutoff = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

  const candidates = await Cart.find({
    'items.savedForLater': false,
    $or: [{ lastAbandonedReminderAt: null }, { lastAbandonedReminderAt: { $lt: reminderCutoff } }],
  });

  for (const cart of candidates) {
    const activeItems = cart.items.filter((i) => !i.savedForLater);
    if (!activeItems.length) continue;

    const oldestAddedAt = activeItems.reduce(
      (min, i) => (i.addedAt < min ? i.addedAt : min),
      activeItems[0].addedAt
    );
    if (oldestAddedAt > cutoff) continue; // not old enough yet

    // eslint-disable-next-line no-await-in-loop
    await sendPushToUser(
      cart.user,
      'abandoned_cart',
      'You left something in your cart',
      `You have ${activeItems.length} item(s) waiting in your cart. Come finish checking out!`,
      {}
    );

    cart.lastAbandonedReminderAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await cart.save();
  }
}

function startAbandonedCartJob() {
  runAbandonedCartCheck().catch((err) => console.warn('[abandonedCartJob] initial run failed', err));
  setInterval(() => {
    runAbandonedCartCheck().catch((err) => console.warn('[abandonedCartJob] run failed', err));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startAbandonedCartJob, runAbandonedCartCheck };
