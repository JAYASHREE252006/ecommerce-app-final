import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';

const ISSUE_LABELS = {
  out_of_stock: 'Out of stock',
  insufficient_stock: 'Only limited stock left',
  price_changed: 'Price has changed since you added this',
  variant_unavailable: 'This size/color is no longer available',
  product_deleted: 'This product is no longer available',
};

function CartLine({ item, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function updateQty(newQty) {
    if (newQty < 1) return;
    setBusy(true);
    try {
      await cartService.updateQuantity(item.itemId, newQty);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await cartService.remove(item.itemId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSaved() {
    setBusy(true);
    try {
      if (item.savedForLaterView) await cartService.moveToCart(item.itemId);
      else await cartService.saveForLater(item.itemId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!item.product) {
    return (
      <div className="flex items-center justify-between border-b border-line py-4 text-sm text-red-600">
        <span>A product in your cart is no longer available.</span>
        <button onClick={remove} className="underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 border-b border-line py-4">
      <Link to={`/products/${item.product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-line/40">
        <img
          src={item.product.images?.[0] || 'https://placehold.co/200x200'}
          alt={item.product.name}
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="flex-1">
        <Link to={`/products/${item.product.id}`} className="text-sm font-medium text-ink">
          {item.product.name}
        </Link>
        {(item.variant?.size || item.variant?.color) && (
          <p className="mt-0.5 text-xs text-ink/50">
            {[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}
          </p>
        )}
        <p className="mt-1 font-display">₹{item.currentPrice}</p>

        {item.issue && (
          <p className="mt-1 text-xs font-medium text-red-600">{ISSUE_LABELS[item.issue] || item.issue}</p>
        )}

        {!item.savedForLaterView && (
          <div className="mt-2 flex items-center gap-2">
            <button
              disabled={busy || item.quantity <= 1}
              onClick={() => updateQty(item.quantity - 1)}
              className="h-7 w-7 rounded-full border border-line disabled:opacity-40"
            >
              −
            </button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <button
              disabled={busy}
              onClick={() => updateQty(item.quantity + 1)}
              className="h-7 w-7 rounded-full border border-line"
            >
              +
            </button>
          </div>
        )}

        <div className="mt-2 flex gap-4 text-xs">
          <button disabled={busy} onClick={toggleSaved} className="text-teal-dark underline-offset-2 hover:underline">
            {item.savedForLaterView ? 'Move to cart' : 'Save for later'}
          </button>
          <button disabled={busy} onClick={remove} className="text-ink/50 underline-offset-2 hover:underline">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.get,
    enabled: !!user,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl">Sign in to view your cart</p>
        <Link to="/login" className="mt-4 inline-block rounded-full bg-ink px-6 py-2.5 text-white">
          Log in
        </Link>
      </div>
    );
  }

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-16">Loading…</div>;

  const items = data?.items || [];
  const savedForLater = data?.savedForLater || [];
  const hasIssues = items.some((i) => i.issue);
  const total = items.reduce((sum, i) => sum + (i.currentPrice || 0) * i.quantity, 0);

  async function handleCheckout() {
    setCheckoutError('');
    setCheckingOut(true);
    try {
      // Re-validate right before checkout - catches anything that went stale
      // since the page loaded (another device, stock sold out elsewhere, etc).
      const validation = await cartService.validate();
      if (!validation.canCheckout) {
        setCheckoutError('Please resolve the issues below before checking out.');
        refresh();
        return;
      }
      await cartService.checkout();
      refresh();
      navigate('/');
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl">Your cart</h1>

      {items.length === 0 ? (
        <p className="mt-6 text-ink/60">Your cart is empty.</p>
      ) : (
        <div className="mt-6">
          {items.map((item) => (
            <CartLine key={item.itemId} item={item} onChanged={refresh} />
          ))}

          <div className="mt-6 flex items-center justify-between">
            <span className="text-ink/60">Total</span>
            <span className="font-display text-xl">₹{total}</span>
          </div>

          {checkoutError && <p className="mt-3 text-sm text-red-600">{checkoutError}</p>}
          {hasIssues && !checkoutError && (
            <p className="mt-3 text-sm text-red-600">
              Some items need attention before you can check out.
            </p>
          )}

          <button
            onClick={handleCheckout}
            disabled={checkingOut || hasIssues}
            className="mt-4 w-full rounded-full bg-ink py-3 text-white disabled:opacity-50"
          >
            {checkingOut ? 'Placing order…' : 'Checkout'}
          </button>
        </div>
      )}

      {savedForLater.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl">Saved for later</h2>
          <div className="mt-4">
            {savedForLater.map((item) => (
              <CartLine key={item.itemId} item={{ ...item, savedForLaterView: true }} onChanged={refresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
