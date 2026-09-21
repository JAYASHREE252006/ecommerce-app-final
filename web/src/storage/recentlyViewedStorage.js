const KEY = 'guest_recently_viewed_v1';
const MAX_ITEMS = 20;

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
    console.warn('[recentlyViewedStorage] failed to write', err);
  }
}

function saveRecentlyViewed(productId) {
  const existing = readAll().filter((item) => item.productId !== productId);
  const updated = [{ productId, viewedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ITEMS);
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

function clearRecentlyViewed() {
  writeAll([]);
}

export const recentlyViewedStorage = {
  saveRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
};
