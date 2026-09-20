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
import { useOfflineViewSync } from './src/hooks/useProductView';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

function RootNavigator() {
  const { colors, effectiveScheme } = useTheme();
  useOfflineViewSync(); // drains queued offline views once connectivity returns

  // React Navigation's own chrome (header bar, back button, screen background
  // during transitions) needs its own theme object - built from our tokens
  // so it matches the rest of the app instead of defaulting to navy/white.
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
