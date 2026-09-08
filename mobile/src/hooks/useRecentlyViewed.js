import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { productActivityService, productService } from '../services/recentlyViewedService';
import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { socketService } from '../services/socketService';

async function fetchGuestRecentlyViewed() {
  const local = await recentlyViewedStorage.getRecentlyViewed();
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
    const handler = (payload) => queryClient.setQueryData(['recentlyViewed', user.id], payload.items);
    socket.on('recentlyViewedUpdated', handler);
    return () => socket.off('recentlyViewedUpdated', handler);
  }, [user, queryClient]);

  // Refetch canonical server state whenever the app returns to the foreground
  // (covers the "no Socket.IO event arrived while backgrounded" case).
  useEffect(() => {
    if (!user) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user.id] });
      }
    });
    return () => sub.remove();
  }, [user, queryClient]);

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
