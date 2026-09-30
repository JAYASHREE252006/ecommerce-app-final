import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProductDetailsScreen } from './src/screens/ProductDetailsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { NotificationSettingsScreen } from './src/screens/NotificationSettingsScreen';
import { useOfflineViewSync } from './src/hooks/useProductView';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

function NotificationHandler() {
  usePushNotifications();
  return null;
}

function RootNavigator() {
  const { colors, effectiveScheme } = useTheme();
  useOfflineViewSync();

  const navTheme = {
    ...(effectiveScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(effectiveScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <NotificationHandler />
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Marketplace' }} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: '' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign up' }} />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ title: 'Notifications' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}