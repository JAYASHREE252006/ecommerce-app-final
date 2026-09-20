import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../ProductCard/ProductCard';
import { useTheme } from '../../context/ThemeContext';

export function RecentlyViewed() {
  const navigation = useNavigation();
  const { items, isLoading } = useRecentlyViewed();
  const { user } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  if (isLoading || !items.length) return null; // hide empty section (spec section 29)

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.ink }]}>Recently Viewed</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={(id) => navigation.navigate('ProductDetails', { productId: id })}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ['recentlyViewed', user?.id || 'guest'] })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 10, marginLeft: 16 },
});
