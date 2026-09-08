import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productService, cartService, wishlistService } from '../services/recentlyViewedService';
import { useProductView } from '../hooks/useProductView';
import { useAuth } from '../context/AuthContext';

export function ProductDetailsScreen({ route }) {
  const { productId } = route.params;
  const { user } = useAuth();
  const [status, setStatus] = useState('');

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.get(productId),
  });

  // Tracked asynchronously - never blocks this screen's render.
  useProductView(productId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Product not found</Text>
      </View>
    );
  }

  async function addToCart() {
    if (!user) return setStatus('Sign in to add to cart');
    try {
      await cartService.add(product._id);
      setStatus('Added to cart');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function addToWishlist() {
    if (!user) return setStatus('Sign in to save items');
    try {
      await wishlistService.add(product._id);
      setStatus('Saved to wishlist');
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
      <Image source={{ uri: product.images?.[0] || 'https://placehold.co/600x600' }} style={styles.image} />
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.brand}>{product.brand}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price}</Text>
          {product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
          )}
        </View>
        <Text style={styles.description}>{product.description || 'No description available.'}</Text>
        <Text style={styles.stock}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={addToCart} disabled={product.stock < 1} style={styles.cartBtn}>
            <Text style={styles.cartBtnText}>Add to cart</Text>
          </Pressable>
          <Pressable onPress={addToWishlist} style={styles.wishBtn}>
            <Text>♡ Wishlist</Text>
          </Pressable>
        </View>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#EEE' },
  title: { fontSize: 22, fontWeight: '700', color: '#1B1F23' },
  brand: { color: '#8A8578', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  price: { fontSize: 20, fontWeight: '700' },
  originalPrice: { color: '#8A8578', textDecorationLine: 'line-through' },
  description: { marginTop: 12, color: '#333', lineHeight: 20 },
  stock: { marginTop: 8, color: '#8A8578', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cartBtn: { backgroundColor: '#1B1F23', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  cartBtnText: { color: 'white', fontWeight: '600' },
  wishBtn: { borderWidth: 1, borderColor: '#DDD9CF', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  status: { marginTop: 10, color: '#0B4F44' },
});
