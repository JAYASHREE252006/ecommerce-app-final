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

/**
 * Centralized theme state: 'light' | 'dark' | 'system'.
 * - Guests: persisted only in localStorage (the inline script in index.html
 *   already applied it before React mounted, so there's no flash).
 * - Logged-in users: the server is the source of truth so the choice follows
 *   them across devices. On login, the server's saved preference overwrites
 *   whatever was in localStorage on this device. Every subsequent change is
 *   written to both localStorage (for instant local reads/no-flash-on-reload)
 *   and the server (for multi-device sync).
 */
export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');

  // Apply immediately whenever theme changes, and react to OS-level changes
  // while in "system" mode.
  useEffect(() => {
    applyThemeClass(theme);
    if (theme !== 'system') return undefined;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // When a user logs in (or the app loads with a valid session), their
  // saved server-side preference becomes authoritative on this device.
  useEffect(() => {
    if (user?.themePreference && user.themePreference !== theme) {
      setThemeState(user.themePreference);
      localStorage.setItem(STORAGE_KEY, user.themePreference);
    }
    // Intentionally only reacts to `user` changing (e.g. login) - see setTheme
    // below for the case where the user changes theme mid-session themselves.
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
          // Non-fatal: the theme still applies locally even if the sync fails.
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
