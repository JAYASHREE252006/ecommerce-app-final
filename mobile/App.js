import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProductDetailsScreen } from './src/screens/ProductDetailsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { useOfflineViewSync } from './src/hooks/useProductView';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

function RootNavigator() {
  useOfflineViewSync(); // drains queued offline views once connectivity returns
  return (
    <Stack.Navigator screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Marketplace' }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign up' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
