import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';

function IssueLabel({ issue }) {
  const labels = {
    out_of_stock: 'Out of stock',
    insufficient_stock: 'Not enough stock for this quantity',
    price_changed: 'Price has changed since you added this',
    variant_unavailable: 'This size/color is no longer available',
    product_deleted: 'This product is no longer available',
  };
  if (!issue) return null;
  return <p className="mt-1 text-xs text-red-600">{labels[issue] || issue}</p>;
}

function CartLineItem({ item, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function updateQty(qty) {
    if (qty < 1) return;
    setBusy(true);
    try {
      await cartService.updateQuantity(item.itemId, qty);
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
      if (item.savedForLater) await cartService.moveToCart(item.itemId);
      else await cartService.saveForLater(item.itemId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!item.product) {
    return (
      <div className="flex items-center justify-between border-b border-line py-4">
        <p className="text-sm text-ink/60">A product in your cart is no longer available.</p>
        <button onClick={remove} className="text-sm text-red-600 underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 border-b border-line py-4">
      <img
        src={item.product.images?.[0] || 'https://placehold.co/100x100'}
        alt={item.product.name}
        className="h-20 w-20 rounded-md object-cover"
      />
      <div className="flex-1">
        <Link to={`/products/${item.product.id}`} className="font-medium hover:underline">
          {item.product.name}
        </Link>
        {(item.variant?.size || item.variant?.color) && (
          <p className="text-xs text-ink/50">
            {[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}
          </p>
        )}
        <p className="mt-1 font-display">₹{item.currentPrice}</p>
        <IssueLabel issue={item.issue} />

        <div className="mt-2 flex items-center gap-3">
          {!item.savedForLater && (
            <div className="flex items-center gap-2 rounded-full border border-line px-2 py-0.5">
              <button disabled={busy} onClick={() => updateQty(item.quantity - 1)} className="px-1">
                −
              </button>
              <span className="w-5 text-center text-sm">{item.quantity}</span>
              <button disabled={busy} onClick={() => updateQty(item.quantity + 1)} className="px-1">
                +
              </button>
            </div>
          )}
          <button disabled={busy} onClick={toggleSaved} className="text-xs text-teal-dark underline">
            {item.savedForLater ? 'Move to cart' : 'Save for later'}
          </button>
          <button disabled={busy} onClick={remove} className="text-xs text-red-600 underline">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p>Please log in to view your cart.</p>
      </div>
    );
  }
  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-16">Loading…</div>;

  const items = data?.items || [];
  const savedForLater = data?.savedForLater || [];
  const hasIssues = items.some((i) => i.issue);
  const subtotal = items.reduce((sum, i) => sum + (i.currentPrice || 0) * i.quantity, 0);

  async function handleCheckout() {
    setCheckoutError('');
    setCheckingOut(true);
    try {
      const validation = await cartService.validate();
      if (!validation.canCheckout) {
        refresh();
        setCheckoutError('Please resolve the issues above before checking out.');
        return;
      }
      await cartService.checkout();
      refresh();
      queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['continueShopping', user?.id] });
      navigate('/');
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl">Your Cart</h1>

      {items.length === 0 ? (
        <p className="mt-6 text-ink/60">Your cart is empty.</p>
      ) : (
        <div className="mt-6">
          {items.map((item) => (
            <CartLineItem key={item.itemId} item={item} onChanged={refresh} />
          ))}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-ink/60">Subtotal</span>
            <span className="font-display text-xl">₹{subtotal}</span>
          </div>
          {checkoutError && <p className="mt-3 text-sm text-red-600">{checkoutError}</p>}
          {hasIssues && !checkoutError && (
            <p className="mt-3 text-sm text-red-600">
              Some items have issues - resolve them before checking out.
            </p>
          )}
          <button
            onClick={handleCheckout}
            disabled={checkingOut || hasIssues}
            className="mt-4 w-full rounded-full bg-primary py-3 text-white disabled:opacity-50"
          >
            {checkingOut ? 'Placing order…' : 'Checkout (Cash on Delivery)'}
          </button>
        </div>
      )}

      {savedForLater.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl">Saved for later</h2>
          <div className="mt-4">
            {savedForLater.map((item) => (
              <CartLineItem key={item.itemId} item={item} onChanged={refresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
