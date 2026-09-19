import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { recommendationService } from '../services/recommendationService';

/**
 * Logged-in users get personalized "You May Also Like" recommendations.
 * Guests (and brand-new users with no signal yet, handled server-side) fall
 * back to trending/best-selling products - the endpoint itself decides that,
 * this hook just picks which endpoint to call based on auth state.
 */
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
    // Recommendations don't need to be as fresh as, say, cart state - a
    // moderate staleTime avoids refetching on every tiny navigation.
    staleTime: 60_000,
  });

  return { items: query.data || [], isLoading: query.isLoading, error: query.error };
}
