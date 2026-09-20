import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useContinueShopping } from '../../hooks/useContinueShopping';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../ProductCard/ProductCard';
import { useTheme } from '../../context/ThemeContext';

export function ContinueShopping() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { items, isLoading } = useContinueShopping();
  const queryClient = useQueryClient();

  if (!user || isLoading || !items.length) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.ink }]}>Continue Shopping</Text>
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
            onChanged={() => queryClient.invalidateQueries({ queryKey: ['continueShopping', user.id] })}
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
