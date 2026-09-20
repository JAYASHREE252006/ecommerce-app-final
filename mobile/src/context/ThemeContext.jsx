import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { lightColors, darkColors, spacing, typography, radii } from '../theme/tokens';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme_preference';

/**
 * Centralized theme state for the whole app: 'light' | 'dark' | 'system'.
 * - First launch: detects the device's current appearance automatically
 *   (via useColorScheme) since no stored preference exists yet.
 * - Manual change: persisted to AsyncStorage immediately, and to the server
 *   if logged in, so it follows the user to their other devices.
 * - Logged-in users: the server's saved value overwrites local storage on
 *   login, matching the web app's sync behavior.
 */
export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [theme, setThemeState] = useState('system');
  const [hydrated, setHydrated] = useState(false);

  // Load whatever was saved locally on first mount.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setThemeState(stored);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Server preference wins once the user is known (login / app-load-with-token).
  useEffect(() => {
    if (user?.themePreference && hydrated) {
      setThemeState(user.themePreference);
      AsyncStorage.setItem(STORAGE_KEY, user.themePreference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated]);

  const setTheme = useCallback(
    async (next) => {
      setThemeState(next);
      await AsyncStorage.setItem(STORAGE_KEY, next);
      if (user) {
        try {
          await api.patch('/auth/theme', { themePreference: next });
        } catch (err) {
          console.warn('[ThemeContext] failed to sync theme to server', err);
        }
      }
    },
    [user]
  );

  const effectiveScheme =
    theme === 'system' ? systemScheme || Appearance.getColorScheme() || 'light' : theme;
  const colors = effectiveScheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, effectiveScheme, colors, spacing, typography, radii, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
