import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';

/**
 * Records a "product viewed" event when a product details page mounts.
 *
 * Guards applied:
 * - `recordedFor` ref means a given productId is only ever recorded once
 *   per mount, so React StrictMode's dev-only double-invoke and any
 *   re-renders from unrelated state changes don't send duplicate requests.
 * - Fire-and-forget: tracking runs after the product is already displayed
 *   and never blocks or breaks the page if it fails (section 14).
 */
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
        })
        .catch((err) => {
          // Non-fatal: the product page already rendered successfully.
          console.warn('[useProductView] server tracking failed', err);
        });
    } else {
      // Guests: local storage never "fails" the way a network call can,
      // so this works even if the backend is completely unreachable.
      recentlyViewedStorage.saveRecentlyViewed(productId);
      queryClient.invalidateQueries({ queryKey: ['recentlyViewed', 'guest'] });
    }
  }, [productId, user, queryClient]);
}
