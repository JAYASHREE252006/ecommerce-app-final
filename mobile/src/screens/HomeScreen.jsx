import { View, Text, FlatList, Image, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/recentlyViewedService';
import { RecentlyViewed } from '../components/RecentlyViewed/RecentlyViewed';
import { ContinueShopping } from '../components/ContinueShopping/ContinueShopping';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const THEME_CYCLE = { light: 'dark', dark: 'system', system: 'light' };
const THEME_ICON = { light: '☀️', dark: '🌙', system: '🖥️' };

export function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors, theme, setTheme } = useTheme();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productService.list({ limit: 12 }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.canvas }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.heading}>Marketplace</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setTheme(THEME_CYCLE[theme])}
                style={styles.themeToggle}
                accessibilityLabel={`Theme: ${theme}. Tap to change.`}
              >
                <Text>{THEME_ICON[theme]}</Text>
              </Pressable>
              {user ? (
                <Pressable onPress={logout}>
                  <Text style={styles.link}>Log out</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.link}>Log in</Text>
                </Pressable>
              )}
            </View>
          </View>
          <RecentlyViewed />
          <ContinueShopping />
          <Text style={[styles.heading, { marginLeft: 16, marginTop: 24, fontSize: 18 }]}>
            All products
          </Text>
        </View>
      }
      data={data?.products || []}
      keyExtractor={(item) => item._id}
      numColumns={2}
      columnWrapperStyle={{ paddingHorizontal: 12, justifyContent: 'space-between' }}
      renderItem={({ item }) => (
        <Pressable
          style={styles.gridCard}
          onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
        >
          <Image source={{ uri: item.images?.[0] || 'https://placehold.co/300x300' }} style={styles.gridImage} />
          <Text numberOfLines={2} style={styles.gridName}>{item.name}</Text>
          <Text style={styles.gridPrice}>₹{item.price}</Text>
        </Pressable>
      )}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

// Built from the active theme's colors on every render - cheap for an app
// this size, and means every screen automatically reflects light/dark/system
// without any component needing its own theme-switching logic.
function createStyles(colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    themeToggle: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    heading: { fontSize: 22, fontWeight: '700', color: colors.ink },
    link: { color: colors.teal, fontWeight: '500' },
    gridCard: { width: '48%', marginBottom: 20 },
    gridImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.line },
    gridName: { marginTop: 6, fontSize: 13, color: colors.ink },
    gridPrice: { fontWeight: '600', marginTop: 2, color: colors.ink },
  });
}
