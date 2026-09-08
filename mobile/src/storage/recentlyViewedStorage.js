import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'guest_recently_viewed_v1';
const MAX_ITEMS = 20;

/**
 * Mobile half of the shared recentlyViewedStorage abstraction (see
 * web/src/storage/recentlyViewedStorage.js for the localStorage version).
 * Same function names, same shape, different backing store - hooks and
 * business logic that use this module don't need to know they're on Expo.
 */

async function readAll() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[recentlyViewedStorage] failed to read, resetting', err);
    return [];
  }
}

async function writeAll(items) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[recentlyViewedStorage] failed to write', err);
  }
}

async function saveRecentlyViewed(productId) {
  const existing = (await readAll()).filter((item) => item.productId !== productId);
  const updated = [{ productId, viewedAt: new Date().toISOString() }, ...existing].slice(
    0,
    MAX_ITEMS
  );
  await writeAll(updated);
  return updated;
}

async function getRecentlyViewed() {
  return readAll();
}

async function removeRecentlyViewed(productId) {
  const updated = (await readAll()).filter((item) => item.productId !== productId);
  await writeAll(updated);
  return updated;
}

async function clearRecentlyViewed() {
  await writeAll([]);
}

export const recentlyViewedStorage = {
  saveRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
};
