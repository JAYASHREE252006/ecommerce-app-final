import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  refunded: 'Refunded',
};

const STATUS_COLOR = {
  pending: 'bg-gold-light text-gold',
  confirmed: 'bg-teal-light text-teal-dark',
  shipped: 'bg-teal-light text-teal-dark',
  delivered: 'bg-teal-light text-teal-dark',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-gold-light text-gold',
  refunded: 'bg-line text-ink/60',
};

function OrderCard({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canReturn = order.status === 'delivered';

  async function handleCancel() {
    const reason = window.prompt('Why are you cancelling this order? (optional)') || '';
    setBusy(true);
    setMessage('');
    try {
      await orderService.cancel(order._id, reason);
      onChanged();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn() {
    const reason = window.prompt('Reason for return?') || '';
    setBusy(true);
    setMessage('');
    try {
      await orderService.requestReturn(order._id, reason);
      onChanged();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReorder() {
    setBusy(true);
    setMessage('');
    try {
      const result = await orderService.reorder(order._id);
      setMessage(
        result.skipped.length
          ? `Added ${result.added} item(s). ${result.skipped.length} item(s) unavailable.`
          : `Added ${result.added} item(s) to your cart.`
      );
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInvoice() {
    try {
      await orderService.downloadInvoice(order._id, order.invoiceNumber);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-lg">{order.invoiceNumber}</p>
          <p className="text-xs text-ink/50">
            {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod.toUpperCase()}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {order.items.map((item, idx) => (
          <p key={idx} className="text-sm text-ink/70">
            {item.product?.name || 'Product no longer available'} × {item.quantity}
            {(item.variant?.size || item.variant?.color) &&
              ` (${[item.variant.size, item.variant.color].filter(Boolean).join(' / ')})`}
          </p>
        ))}
      </div>

      <p className="mt-2 font-display">Total: ₹{order.totalAmount}</p>

      {message && <p className="mt-2 text-sm text-teal-dark">{message}</p>}

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <button onClick={handleInvoice} className="text-teal-dark underline">
          Download invoice
        </button>
        <button disabled={busy} onClick={handleReorder} className="text-teal-dark underline">
          Reorder
        </button>
        {canCancel && (
          <button disabled={busy} onClick={handleCancel} className="text-red-600 underline">
            Cancel order
          </button>
        )}
        {canReturn && (
          <button disabled={busy} onClick={handleReturn} className="text-red-600 underline">
            Request return
          </button>
        )}
      </div>
    </div>
  );
}

export function OrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, status, sortBy, order],
    queryFn: () => orderService.list({ page, limit: 5, status: status || undefined, sortBy, order }),
    enabled: !!user,
    keepPreviousData: true,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>
          Please <Link to="/login" className="underline">log in</Link> to view your orders.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl">My Orders</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="return_requested">Return requested</option>
          <option value="refunded">Refunded</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="createdAt">Sort by date</option>
          <option value="totalAmount">Sort by amount</option>
        </select>

        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="desc">Newest / highest first</option>
          <option value="asc">Oldest / lowest first</option>
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-ink/60">Loading…</p>
      ) : !data?.orders?.length ? (
        <p className="mt-8 text-ink/60">No orders found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {data.orders.map((order) => (
            <OrderCard key={order._id} order={order} onChanged={refresh} />
          ))}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-line px-4 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-ink/60">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-line px-4 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
