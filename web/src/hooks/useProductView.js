import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';

export function useProductView(productId) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recordedFor = useRef(null);

  useEffect(() => {
    if (!productId || recordedFor.current === productId) return;
    recordedFor.current = productId;

    if (user) {
      productActivityService
        .recordView(productId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
          queryClient.invalidateQueries({ queryKey: ['recommendations', user.id] });
        })
        .catch((err) => {
          console.warn('[useProductView] server tracking failed', err);
        });
    } else {
      recentlyViewedStorage.saveRecentlyViewed(productId);
      queryClient.invalidateQueries({ queryKey: ['recentlyViewed', 'guest'] });
    }
  }, [productId, user, queryClient]);
}
