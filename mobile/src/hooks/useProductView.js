import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { pendingViewsQueue } from '../storage/pendingViewsQueue';

/**
 * Same StrictMode/duplicate-mount guard as the web hook (recordedFor ref).
 * Additionally: if a logged-in user is offline, the view is queued locally
 * instead of dropped, and flushed once connectivity returns (spec section 24).
 */
export function useProductView(productId) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recordedFor = useRef(null);

  useEffect(() => {
    if (!productId || recordedFor.current === productId) return;
    recordedFor.current = productId;

    (async () => {
      if (!user) {
        await recentlyViewedStorage.saveRecentlyViewed(productId);
        queryClient.invalidateQueries({ queryKey: ['recentlyViewed', 'guest'] });
        return;
      }

      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        await pendingViewsQueue.enqueue(productId);
        return;
      }

      try {
        await productActivityService.recordView(productId);
        queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
      } catch (err) {
        // Network blip mid-request - don't lose the view, queue it for retry.
        await pendingViewsQueue.enqueue(productId);
        console.warn('[useProductView] view failed, queued for retry', err);
      }
    })();
  }, [productId, user, queryClient]);
}

/**
 * Mount this once near the app root (for logged-in users) to drain the
 * offline queue as soon as connectivity comes back.
 */
export function useOfflineViewSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected) return;

      const items = await pendingViewsQueue.drain();
      if (!items.length) return;

      try {
        await productActivityService.syncRecentlyViewed(items);
        queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
      } catch (err) {
        // Couldn't reach the server even though NetInfo says we're online
        // (e.g. captive portal) - put the items back for the next attempt.
        await pendingViewsQueue.requeue(items);
        console.warn('[useOfflineViewSync] drain failed, requeued', err);
      }
    });

    return () => unsubscribe();
  }, [user, queryClient]);
}
