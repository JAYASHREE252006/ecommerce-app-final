import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { productService } from '../services/recentlyViewedService';
import { cartService } from '../services/cartService';
import { wishlistService } from '../services/recentlyViewedService';
import { useProductView } from '../hooks/useProductView';
import { useAuth } from '../context/AuthContext';

export function ProductDetails() {
  const { productId } = useParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

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

  const hasVariants = product.variants && product.variants.length > 0;
  const sizes = hasVariants ? [...new Set(product.variants.map((v) => v.size).filter(Boolean))] : [];
  const colors = hasVariants ? [...new Set(product.variants.map((v) => v.color).filter(Boolean))] : [];
  const selectedVariant = hasVariants
    ? product.variants.find((v) => v.size === selectedSize && v.color === selectedColor)
    : null;
  const variantReady = !hasVariants || (selectedSize && selectedColor);
  const stockForSelection = hasVariants ? selectedVariant?.stock ?? 0 : product.stock;
  const canAddToCart = variantReady && stockForSelection > 0;

  async function addToCart() {
    if (!user) return setStatus('Sign in to add to cart');
    try {
      await cartService.add(product._id, 1, hasVariants ? { size: selectedSize, color: selectedColor } : {});
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

          {hasVariants && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-sm text-ink/60">Size</p>
                <div className="flex gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selectedSize === size ? 'border-primary bg-primary text-white' : 'border-line text-ink'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-ink/60">Color</p>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selectedColor === color ? 'border-primary bg-primary text-white' : 'border-line text-ink'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-ink/50">
            {stockForSelection > 0 ? `${stockForSelection} in stock` : 'Out of stock'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={addToCart}
              disabled={!canAddToCart}
              className="rounded-full bg-primary px-6 py-2.5 text-white disabled:opacity-50"
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
