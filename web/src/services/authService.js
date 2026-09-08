import api from './api';

export const authService = {
  async register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data.data;
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },
  async me() {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },
};
