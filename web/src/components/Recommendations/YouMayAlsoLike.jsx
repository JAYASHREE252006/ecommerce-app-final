import { useQueryClient } from '@tanstack/react-query';
import { useRecommendations } from '../../hooks/useRecommendations';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../ProductCard/ProductCard';
import { ProductCarouselSection, CardSkeleton } from '../Layout/ProductCarouselSection';

export function YouMayAlsoLike() {
  const { items, isLoading } = useRecommendations();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <ProductCarouselSection title="You May Also Like">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </ProductCarouselSection>
    );
  }

  if (!items.length) return null;

  return (
    <ProductCarouselSection title="You May Also Like">
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onChanged={() =>
            queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id || 'guest'] })
          }
        />
      ))}
    </ProductCarouselSection>
  );
}
