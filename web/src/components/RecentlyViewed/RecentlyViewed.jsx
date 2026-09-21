import { useQueryClient } from '@tanstack/react-query';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../ProductCard/ProductCard';
import { ProductCarouselSection, CardSkeleton } from '../Layout/ProductCarouselSection';

export function RecentlyViewed() {
  const { items, isLoading } = useRecentlyViewed();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <ProductCarouselSection title="Recently Viewed">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </ProductCarouselSection>
    );
  }
  if (!items.length) return null;

  return (
    <ProductCarouselSection title="Recently Viewed">
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user?.id || 'guest'] })}
        />
      ))}
    </ProductCarouselSection>
  );
}
