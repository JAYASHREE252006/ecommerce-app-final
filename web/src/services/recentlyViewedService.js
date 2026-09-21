import api from './api';

export const productActivityService = {
  async recordView(productId) {
    const res = await api.post(`/products/${productId}/view`);
    return res.data.data;
  },
  async getRecentlyViewed() {
    const res = await api.get('/users/recently-viewed');
    return res.data.data.items;
  },
  async syncRecentlyViewed(items) {
    const res = await api.post('/users/recently-viewed/sync', { items });
    return res.data.data.items;
  },
  async getContinueShopping() {
    const res = await api.get('/users/continue-shopping');
    return res.data.data.items;
  },
};

export const productService = {
  async list(params = {}) {
    const res = await api.get('/products', { params });
    return res.data.data;
  },
  async get(productId) {
    const res = await api.get(`/products/${productId}`);
    return res.data.data.product;
  },
};

export const wishlistService = {
  async get() {
    const res = await api.get('/wishlist');
    return res.data.data.products;
  },
  async add(productId) {
    const res = await api.post('/wishlist', { productId });
    return res.data.data.products;
  },
  async remove(productId) {
    const res = await api.delete(`/wishlist/${productId}`);
    return res.data.data.products;
  },
};
