import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { pendingViewsQueue } from '../storage/pendingViewsQueue';

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
        await pendingViewsQueue.enqueue(productId);
        console.warn('[useProductView] view failed, queued for retry', err);
      }
    })();
  }, [productId, user, queryClient]);
}

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
        await pendingViewsQueue.requeue(items);
        console.warn('[useOfflineViewSync] drain failed, requeued', err);
      }
    });

    return () => unsubscribe();
  }, [user, queryClient]);
}
