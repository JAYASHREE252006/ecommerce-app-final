import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pending_view_queue_v1';

/**
 * Holds product views made by a LOGGED-IN user while offline, so activity
 * isn't lost (spec section 24). Guests don't need this - their history is
 * already fully local. Drained once connectivity returns (see useProductView).
 */

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function enqueue(productId) {
  const queue = await readQueue();
  queue.push({ productId, viewedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

async function drain() {
  const queue = await readQueue();
  await AsyncStorage.setItem(KEY, JSON.stringify([]));
  return queue;
}

/** Puts unsent items back if a drain attempt fails partway (e.g. connection drops mid-sync). */
async function requeue(items) {
  const queue = await readQueue();
  await AsyncStorage.setItem(KEY, JSON.stringify([...queue, ...items]));
}

export const pendingViewsQueue = { enqueue, drain, requeue };
