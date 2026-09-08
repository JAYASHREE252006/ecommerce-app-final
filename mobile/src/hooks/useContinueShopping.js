import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { productActivityService } from '../services/recentlyViewedService';
import { socketService } from '../services/socketService';

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
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['continueShopping', user.id] });
    socket.on('recentlyViewedUpdated', invalidate);
    socket.on('purchaseUpdated', invalidate);
    return () => {
      socket.off('recentlyViewedUpdated', invalidate);
      socket.off('purchaseUpdated', invalidate);
    };
  }, [user, queryClient]);

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
