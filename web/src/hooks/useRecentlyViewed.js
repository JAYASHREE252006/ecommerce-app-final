import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService, productService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { socketService } from '../services/socketService';

/**
 * Guests: reads local history, then fetches product details for those ids
 * (products don't move, so this is a light batch of GETs, not N+1 writes).
 * Authenticated users: server is canonical - one enriched request.
 */
async function fetchGuestRecentlyViewed() {
  const local = recentlyViewedStorage.getRecentlyViewed();
  if (!local.length) return [];

  const products = await Promise.all(
    local.map(async (item) => {
      try {
        const product = await productService.get(item.productId);
        return { ...product, id: product._id, viewedAt: item.viewedAt };
      } catch {
        return null; // product deleted/unavailable - drop it silently
      }
    })
  );
  return products.filter(Boolean);
}

export function useRecentlyViewed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recentlyViewed', user?.id || 'guest'],
    queryFn: user ? productActivityService.getRecentlyViewed : fetchGuestRecentlyViewed,
    staleTime: 30_000,
  });

  // Real-time: other devices/tabs for the same logged-in user push updates here.
  useEffect(() => {
    if (!user) return undefined;
    const socket = socketService.getSocket();
    if (!socket) return undefined;

    const handler = (payload) => {
      queryClient.setQueryData(['recentlyViewed', user.id], payload.items);
    };
    socket.on('recentlyViewedUpdated', handler);
    return () => socket.off('recentlyViewedUpdated', handler);
  }, [user, queryClient]);

  // Authenticated users should always trust the server on (re)focus, per spec section 8.
  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, queryClient]);

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
