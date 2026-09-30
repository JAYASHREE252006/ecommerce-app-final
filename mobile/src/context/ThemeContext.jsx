import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { lightColors, darkColors, spacing, typography, radii } from '../theme/tokens';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme_preference';

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState('system');
  const [hydrated, setHydrated] = useState(false);

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
