import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/recentlyViewedService';
import { cartService } from '../services/cartService';
import { wishlistService } from '../services/recentlyViewedService';
import { useProductView } from '../hooks/useProductView';
import { useAuth } from '../context/AuthContext';
import { useMemo, useState } from 'react';

export function ProductDetails() {
  const { productId } = useParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [adding, setAdding] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.get(productId),
  });

  useProductView(productId);

  const hasVariants = product?.variants?.length > 0;
  const sizes = useMemo(
    () => (hasVariants ? [...new Set(product.variants.map((v) => v.size).filter(Boolean))] : []),
    [product, hasVariants]
  );
  const colors = useMemo(
    () => (hasVariants ? [...new Set(product.variants.map((v) => v.color).filter(Boolean))] : []),
    [product, hasVariants]
  );

  const selectedVariant = hasVariants
    ? product.variants.find((v) => v.size === selectedSize && v.color === selectedColor)
    : null;

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-16">Loading…</div>;
  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="font-display text-xl">Product not found</p>
        <p className="mt-1 text-ink/60">It may have been removed or the link is incorrect.</p>
      </div>
    );
  }

  const effectivePrice = product.price + (selectedVariant?.priceModifier || 0);
  const effectiveStock = hasVariants ? selectedVariant?.stock ?? null : product.stock;
  const canAdd = hasVariants ? !!selectedVariant && effectiveStock > 0 : effectiveStock > 0;

  async function addToCart() {
    if (!user) return setStatus('Sign in to add to cart');
    if (hasVariants && !selectedVariant) return setStatus('Please select a size and color');
    setAdding(true);
    setStatus('');
    try {
      await cartService.add(product._id, 1, hasVariants ? { size: selectedSize, color: selectedColor } : {});
      setStatus('Added to cart');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setAdding(false);
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
            <span className="font-display text-2xl">₹{effectivePrice}</span>
            {product.originalPrice > effectivePrice && (
              <span className="text-ink/40 line-through">₹{product.originalPrice}</span>
            )}
          </div>
          <p className="mt-4 text-ink/70">{product.description || 'No description available.'}</p>

          {hasVariants && (
            <div className="mt-5 space-y-3">
              {sizes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/50">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          selectedSize === size ? 'border-ink bg-ink text-white' : 'border-line'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {colors.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/50">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          selectedColor === color ? 'border-ink bg-ink text-white' : 'border-line'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedSize && selectedColor && !selectedVariant && (
                <p className="text-xs text-red-600">This combination isn't available.</p>
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-ink/50">
            {effectiveStock === null
              ? 'Select options to see availability'
              : effectiveStock > 0
              ? `${effectiveStock} in stock`
              : 'Out of stock'}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={addToCart}
              disabled={!canAdd || adding}
              className="rounded-full bg-ink px-6 py-2.5 text-white disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add to cart'}
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
