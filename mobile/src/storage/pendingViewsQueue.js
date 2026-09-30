import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pending_view_queue_v1';

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

async function requeue(items) {
  const queue = await readQueue();
  await AsyncStorage.setItem(KEY, JSON.stringify([...queue, ...items]));
}

export const pendingViewsQueue = { enqueue, drain, requeue };
