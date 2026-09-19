import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productService } from '../services/recentlyViewedService';
import { RecentlyViewed } from '../components/RecentlyViewed/RecentlyViewed';
import { ContinueShopping } from '../components/ContinueShopping/ContinueShopping';
import { YouMayAlsoLike } from '../components/Recommendations/YouMayAlsoLike';
import { CardSkeleton } from '../components/Layout/ProductCarouselSection';

export function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productService.list({ limit: 12 }),
  });

  return (
    <div>
      <section className="border-b border-line bg-teal-light/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-xl font-display text-4xl leading-tight text-ink sm:text-5xl">
            Things worth going back for.
          </h1>
          <p className="mt-3 max-w-md text-ink/60">
            Browse today's picks, and we'll remember what caught your eye.
          </p>
        </div>
      </section>

      <RecentlyViewed />
      <ContinueShopping />
      <YouMayAlsoLike />

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-4 font-display text-2xl">All products</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          {data?.products?.map((p) => (
            <Link key={p._id} to={`/products/${p._id}`} className="block">
              <div className="aspect-square overflow-hidden rounded-md bg-line/40">
                <img
                  src={p.images?.[0] || 'https://placehold.co/400x400'}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm">{p.name}</p>
              <p className="font-display">₹{p.price}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
