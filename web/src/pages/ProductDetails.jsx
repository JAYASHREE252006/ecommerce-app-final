import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productService, cartService, wishlistService } from '../services/recentlyViewedService';
import { useProductView } from '../hooks/useProductView';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export function ProductDetails() {
  const { productId } = useParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('');

  // Product page renders from `data` immediately; tracking happens
  // asynchronously in the background and never blocks/breaks this page.
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.get(productId),
  });

  useProductView(productId);

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-16">Loading…</div>;
  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="font-display text-xl">Product not found</p>
        <p className="mt-1 text-ink/60">It may have been removed or the link is incorrect.</p>
      </div>
    );
  }

  async function addToCart() {
    if (!user) return setStatus('Sign in to add to cart');
    try {
      await cartService.add(product._id);
      setStatus('Added to cart');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function addToWishlist() {
    if (!user) return setStatus('Sign in to save items');
    try {
      await wishlistService.add(product._id);
      setStatus('Saved to wishlist');
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-md bg-line/40">
          <img
            src={product.images?.[0] || 'https://placehold.co/600x600'}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h1 className="font-display text-3xl">{product.name}</h1>
          <p className="mt-1 text-ink/50">{product.brand}</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-2xl">₹{product.price}</span>
            {product.originalPrice > product.price && (
              <span className="text-ink/40 line-through">₹{product.originalPrice}</span>
            )}
          </div>
          <p className="mt-4 text-ink/70">{product.description || 'No description available.'}</p>
          <p className="mt-2 text-sm text-ink/50">
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={addToCart}
              disabled={product.stock < 1}
              className="rounded-full bg-ink px-6 py-2.5 text-white disabled:opacity-50"
            >
              Add to cart
            </button>
            <button onClick={addToWishlist} className="rounded-full border border-line px-6 py-2.5">
              ♡ Wishlist
            </button>
          </div>
          {status && <p className="mt-3 text-sm text-teal-dark">{status}</p>}
        </div>
      </div>
    </div>
  );
}
