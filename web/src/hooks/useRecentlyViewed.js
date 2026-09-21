import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService, productService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { socketService } from '../services/socketService';

async function fetchGuestRecentlyViewed() {
  const local = recentlyViewedStorage.getRecentlyViewed();
  if (!local.length) return [];
  const products = await Promise.all(
    local.map(async (item) => {
      try {
        const product = await productService.get(item.productId);
        return { ...product, id: product._id, viewedAt: item.viewedAt };
      } catch {
        return null;
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

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, queryClient]);

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
