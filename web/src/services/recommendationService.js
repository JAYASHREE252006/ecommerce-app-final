import api from './api';

export const recommendationService = {
  async getRecommendations() {
    const res = await api.get('/users/recommendations');
    return res.data.data;
  },
  async getTrending() {
    const res = await api.get('/products/trending');
    return res.data.data.products;
  },
};
