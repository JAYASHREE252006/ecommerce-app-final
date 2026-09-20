import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { cartService, wishlistService } from '../../services/recentlyViewedService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function ProductCard({ product, onPress, onChanged }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cartState, setCartState] = useState(product.isInCart ? 'in_cart' : 'idle');
  const [wishState, setWishState] = useState(product.isWishlisted ? 'saved' : 'idle');
  const outOfStock = product.availability === 'out_of_stock';

  async function handleAddToCart() {
    if (!user || outOfStock || cartState === 'loading' || cartState === 'in_cart') return;
    setCartState('loading');
    try {
      await cartService.add(product.id);
      setCartState('in_cart');
      onChanged?.();
    } catch {
      setCartState('idle');
    }
  }

  async function handleToggleWishlist() {
    if (!user || wishState === 'loading') return;
    setWishState('loading');
    try {
      if (wishState === 'saved') {
        await wishlistService.remove(product.id);
        setWishState('idle');
      } else {
        await wishlistService.add(product.id);
        setWishState('saved');
      }
      onChanged?.();
    } catch {
      setWishState(product.isWishlisted ? 'saved' : 'idle');
    }
  }

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPress(product.id)}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: product.images?.[0] || 'https://placehold.co/400x400' }}
            style={styles.image}
          />
          {outOfStock && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Out of stock</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
      </Pressable>

      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{product.price}</Text>
        {product.originalPrice > product.price && (
          <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleAddToCart}
          disabled={outOfStock || cartState === 'loading' || cartState === 'in_cart'}
          style={[styles.cartBtn, (outOfStock || cartState === 'in_cart') && styles.disabled]}
        >
          <Text style={styles.cartBtnText}>
            {cartState === 'loading' ? 'Adding…' : cartState === 'in_cart' ? 'In cart' : 'Add to cart'}
          </Text>
        </Pressable>
        <Pressable onPress={handleToggleWishlist} style={styles.wishBtn}>
          <Text style={{ color: wishState === 'saved' ? colors.teal : colors.inkMuted, fontSize: 16 }}>
            {wishState === 'saved' ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { width: 150, marginRight: 12 },
    imageWrap: { width: 150, height: 150, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.line },
    image: { width: '100%', height: '100%' },
    badge: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: colors.overlay,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: { color: 'white', fontSize: 10 },
    name: { marginTop: 6, fontSize: 13, color: colors.ink, minHeight: 34 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
    price: { fontSize: 15, fontWeight: '600', color: colors.ink },
    originalPrice: { fontSize: 12, color: colors.inkMuted, textDecorationLine: 'line-through' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    cartBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 6, alignItems: 'center' },
    cartBtnText: { color: 'white', fontSize: 12, fontWeight: '500' },
    wishBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    disabled: { opacity: 0.5 },
  });
}
