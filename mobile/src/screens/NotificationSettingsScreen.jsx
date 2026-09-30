import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';

const CATEGORY_LABELS = {
  order_confirmation: 'Order confirmations',
  payment_update: 'Payment updates',
  shipping_update: 'Shipping updates',
  delivery_update: 'Delivery updates',
  price_drop: 'Price drops on wishlist items',
  back_in_stock: 'Back-in-stock alerts',
  abandoned_cart: 'Abandoned cart reminders',
  promotion: 'Promotions and offers',
};

export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService
      .getPreferences()
      .then(setPreferences)
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next); // optimistic
    try {
      await notificationService.updatePreferences({ [key]: next[key] });
    } catch (err) {
      setPreferences(preferences); // revert on failure
    }
  }

  if (loading || !preferences) {
    return (
      <View style={[styles.center, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={styles.heading}>Notification preferences</Text>
      {Object.keys(CATEGORY_LABELS).map((key) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{CATEGORY_LABELS[key]}</Text>
          <Switch
            value={!!preferences[key]}
            onValueChange={() => toggle(key)}
            trackColor={{ false: colors.line, true: colors.teal }}
          />
        </View>
      ))}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, padding: 20 },
    heading: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 16 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    label: { fontSize: 14, color: colors.ink, flex: 1, marginRight: 12 },
  });
}
