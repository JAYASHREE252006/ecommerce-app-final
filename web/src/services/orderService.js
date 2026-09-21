import api from './api';

export const orderService = {
  async list(params = {}) {
    const res = await api.get('/orders', { params });
    return res.data.data; // { orders, page, totalPages, total }
  },
  async getById(orderId) {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data.order;
  },
  async cancel(orderId, reason) {
    const res = await api.patch(`/orders/${orderId}/cancel`, { reason });
    return res.data.data.order;
  },
  async requestReturn(orderId, reason) {
    const res = await api.patch(`/orders/${orderId}/return`, { reason });
    return res.data.data.order;
  },
  async reorder(orderId) {
    const res = await api.post(`/orders/${orderId}/reorder`);
    return res.data.data; // { added, skipped }
  },
  /** Downloads the PDF invoice directly to the browser via a Blob. */
  async downloadInvoice(orderId, invoiceNumber) {
    const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
