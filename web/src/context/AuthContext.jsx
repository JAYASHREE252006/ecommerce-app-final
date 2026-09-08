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

  // On app load: if a token exists, validate it and reconnect the socket.
  // If invalid/expired, fall back to a clean guest state instead of erroring.
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

  const afterAuthSuccess = useCallback(async ({ user: u, token }) => {
    localStorage.setItem('auth_token', token);
    setUser(u);
    socketService.connectSocket(token);
    // Guest -> account merge (section 6/7 of the spec).
    await authSyncService.syncGuestHistoryToServer();
    // Recently-viewed / continue-shopping widgets should reflect the merged server state immediately.
    queryClient.invalidateQueries({ queryKey: ['recentlyViewed'] });
    queryClient.invalidateQueries({ queryKey: ['continueShopping'] });
  }, [queryClient]);

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
    // Critical: tear down the socket and any per-user cached data so the
    // NEXT guest/user on this device never sees this user's activity.
    localStorage.removeItem('auth_token');
    socketService.disconnectSocket();
    setUser(null);
    // Drop ALL cached server-state, not just recently-viewed - a stale cache
    // is exactly how user A's data could leak onto user B's screen.
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
