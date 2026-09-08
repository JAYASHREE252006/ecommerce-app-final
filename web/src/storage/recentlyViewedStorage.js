const KEY = 'guest_recently_viewed_v1';
const MAX_ITEMS = 20;

/**
 * Guest recently-viewed history, persisted in the browser via localStorage.
 * Shape: [{ productId, viewedAt }, ...] newest first.
 *
 * This is the web half of the shared `recentlyViewedStorage` abstraction -
 * the Expo app implements the identical function names against
 * AsyncStorage, so hooks/business logic never need to know which platform
 * they're running on.
 */

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[recentlyViewedStorage] failed to read, resetting', err);
    return [];
  }
}

function writeAll(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (err) {
    // localStorage can throw in private-browsing/quota-exceeded situations.
    // Recently-viewed is a nice-to-have, so we swallow the error rather
    // than breaking the page.
    console.warn('[recentlyViewedStorage] failed to write', err);
  }
}

/** Records a view locally: moves the product to the front, dedupes, caps at MAX_ITEMS. */
function saveRecentlyViewed(productId) {
  const existing = readAll().filter((item) => item.productId !== productId);
  const updated = [{ productId, viewedAt: new Date().toISOString() }, ...existing].slice(
    0,
    MAX_ITEMS
  );
  writeAll(updated);
  return updated;
}

function getRecentlyViewed() {
  return readAll();
}

function removeRecentlyViewed(productId) {
  const updated = readAll().filter((item) => item.productId !== productId);
  writeAll(updated);
  return updated;
}

/** Called after a successful guest -> login merge, so the same items aren't merged twice. */
function clearRecentlyViewed() {
  writeAll([]);
}

export const recentlyViewedStorage = {
  saveRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
};
