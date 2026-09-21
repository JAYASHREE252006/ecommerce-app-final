import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { recommendationService } from '../services/recommendationService';

export function useRecommendations() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['recommendations', user?.id || 'guest'],
    queryFn: async () => {
      if (user) {
        const { products } = await recommendationService.getRecommendations();
        return products;
      }
      return recommendationService.getTrending();
    },
    staleTime: 60_000,
  });

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
