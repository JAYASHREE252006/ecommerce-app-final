import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { socketService } from '../services/socketService';

/**
 * Continue Shopping requires purchase history, so it only makes sense for
 * authenticated users (guests have no order history to exclude against).
 */
export function useContinueShopping() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['continueShopping', user?.id],
    queryFn: productActivityService.getContinueShopping,
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return undefined;
    const socket = socketService.getSocket();
    if (!socket) return undefined;

    const onRecentlyViewed = () =>
      queryClient.invalidateQueries({ queryKey: ['continueShopping', user.id] });
    const onPurchase = () =>
      queryClient.invalidateQueries({ queryKey: ['continueShopping', user.id] });

    socket.on('recentlyViewedUpdated', onRecentlyViewed);
    socket.on('purchaseUpdated', onPurchase);
    return () => {
      socket.off('recentlyViewedUpdated', onRecentlyViewed);
      socket.off('purchaseUpdated', onPurchase);
    };
  }, [user, queryClient]);

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
