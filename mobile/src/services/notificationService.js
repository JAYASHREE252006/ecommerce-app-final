import api from './api';

export const notificationService = {
  async registerToken(token, platform) {
    await api.post('/notifications/register-token', { token, platform });
  },
  async unregisterToken(token) {
    await api.delete('/notifications/register-token', { data: { token } });
  },
  async getPreferences() {
    const res = await api.get('/notifications/preferences');
    return res.data.data.preferences;
  },
  async updatePreferences(preferences) {
    const res = await api.patch('/notifications/preferences', { preferences });
    return res.data.data.preferences;
  },
  async getHistory() {
    const res = await api.get('/notifications/history');
    return res.data.data.notifications;
  },
};
