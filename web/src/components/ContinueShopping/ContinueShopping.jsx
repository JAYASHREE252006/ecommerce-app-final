import { useQueryClient } from '@tanstack/react-query';
import { useContinueShopping } from '../../hooks/useContinueShopping';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../ProductCard/ProductCard';
import { ProductCarouselSection, CardSkeleton } from '../Layout/ProductCarouselSection';

export function ContinueShopping() {
  const { user } = useAuth();
  const { items, isLoading } = useContinueShopping();
  const queryClient = useQueryClient();

  if (!user) return null;
  if (isLoading) {
    return (
      <ProductCarouselSection title="Continue Shopping">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </ProductCarouselSection>
    );
  }
  if (!items.length) return null;

  return (
    <ProductCarouselSection title="Continue Shopping">
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['continueShopping', user.id] })}
        />
      ))}
    </ProductCarouselSection>
  );
}
