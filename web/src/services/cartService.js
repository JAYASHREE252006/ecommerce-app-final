import api from './api';

export const cartService = {
  async get() {
    const res = await api.get('/cart');
    return res.data.data; // { items, savedForLater }
  },
  async add(productId, quantity = 1, variant = {}) {
    const res = await api.post('/cart/items', { productId, quantity, variant });
    return res.data.data;
  },
  async updateQuantity(itemId, quantity) {
    const res = await api.patch(`/cart/items/${itemId}`, { quantity });
    return res.data.data;
  },
  async remove(itemId) {
    const res = await api.delete(`/cart/items/${itemId}`);
    return res.data.data;
  },
  async saveForLater(itemId) {
    const res = await api.post(`/cart/items/${itemId}/save-for-later`);
    return res.data.data;
  },
  async moveToCart(itemId) {
    const res = await api.post(`/cart/items/${itemId}/move-to-cart`);
    return res.data.data;
  },
  async validate() {
    const res = await api.get('/cart/validate');
    return res.data.data; // { canCheckout, issues, items }
  },
  async checkout() {
    const res = await api.post('/orders');
    return res.data.data.order;
  },
};

