import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cartService, wishlistService } from '../../services/recentlyViewedService';
import { useAuth } from '../../context/AuthContext';

export function ProductCard({ product, onChanged }) {
  const { user } = useAuth();
  const [cartState, setCartState] = useState(product.isInCart ? 'in_cart' : 'idle');
  const [wishState, setWishState] = useState(product.isWishlisted ? 'saved' : 'idle');
  const [error, setError] = useState('');

  const outOfStock = product.availability === 'out_of_stock';

  async function handleAddToCart() {
    if (!user) {
      setError('Sign in to add to cart');
      return;
    }
    if (outOfStock) return;
    setCartState('loading');
    setError('');
    try {
      await cartService.add(product.id);
      setCartState('in_cart');
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setCartState('idle');
    }
  }

  async function handleToggleWishlist() {
    if (!user) {
      setError('Sign in to save items');
      return;
    }
    setWishState('loading');
    setError('');
    try {
      if (wishState === 'saved') {
        await wishlistService.remove(product.id);
        setWishState('idle');
      } else {
        await wishlistService.add(product.id);
        setWishState('saved');
      }
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setWishState(product.isWishlisted ? 'saved' : 'idle');
    }
  }

  return (
    <div className="w-44 shrink-0 sm:w-52">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-line/40">
          <img
            src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image';
            }}
          />
          {outOfStock && (
            <span className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-[11px] text-white">
              Out of stock
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-ink">{product.name}</p>
      </Link>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-base">₹{product.price}</span>
        {product.originalPrice > product.price && (
          <span className="text-xs text-ink/40 line-through">₹{product.originalPrice}</span>
        )}
        {product.discountPercent > 0 && (
          <span className="text-xs text-teal">{product.discountPercent}% off</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || cartState === 'loading' || cartState === 'in_cart'}
          className="flex-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cartState === 'loading' ? 'Adding…' : cartState === 'in_cart' ? 'In cart' : 'Add to cart'}
        </button>
        <button
          onClick={handleToggleWishlist}
          disabled={wishState === 'loading'}
          aria-label="Toggle wishlist"
          className={`rounded-full border px-2.5 py-1.5 text-sm transition ${
            wishState === 'saved' ? 'border-teal text-teal' : 'border-line text-ink/60'
          }`}
        >
          {wishState === 'saved' ? '♥' : '♡'}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
