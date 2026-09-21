import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme_preference';

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(theme) {
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');

  useEffect(() => {
    applyThemeClass(theme);
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (user?.themePreference && user.themePreference !== theme) {
      setThemeState(user.themePreference);
      localStorage.setItem(STORAGE_KEY, user.themePreference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setTheme = useCallback(
    async (next) => {
      setThemeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (user) {
        try {
          await api.patch('/auth/theme', { themePreference: next });
        } catch (err) {
          console.warn('[ThemeContext] failed to sync theme preference to server', err);
        }
      }
    },
    [user]
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
