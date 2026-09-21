import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';
import { authSyncService } from '../services/authSyncService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((u) => {
        setUser(u);
        socketService.connectSocket(token);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const afterAuthSuccess = useCallback(
    async ({ user: u, token }) => {
      localStorage.setItem('auth_token', token);
      setUser(u);
      socketService.connectSocket(token);
      await authSyncService.syncGuestHistoryToServer();
      queryClient.invalidateQueries({ queryKey: ['recentlyViewed'] });
      queryClient.invalidateQueries({ queryKey: ['continueShopping'] });
    },
    [queryClient]
  );

  const login = useCallback(
    async (email, password) => {
      const result = await authService.login(email, password);
      await afterAuthSuccess(result);
    },
    [afterAuthSuccess]
  );

  const register = useCallback(
    async (name, email, password) => {
      const result = await authService.register(name, email, password);
      await afterAuthSuccess(result);
    },
    [afterAuthSuccess]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    socketService.disconnectSocket();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
