import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TOKEN_STORAGE_KEY = 'expo_push_token';

// Controls how a notification that arrives while the app is OPEN behaves.
// Without this, foreground notifications are silently swallowed on iOS.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission, obtains this device's Expo push token,
 * and registers/unregisters it with the backend as the user logs in/out.
 * Also wires up foreground + tap handling.
 *
 * IMPORTANT: getExpoPushTokenAsync requires a `projectId`, which only
 * exists once this project is linked to an Expo account (see mobile/README
 * / the setup steps - running `eas init` or `npx expo login` +
 * `eas project:init` populates app.json's extra.eas.projectId). Until then,
 * this hook will log a warning and skip registration rather than crash -
 * everything else in the app keeps working.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    let isMounted = true;

    (async () => {
      if (!Device.isDevice) {
        console.warn('[usePushNotifications] Push notifications require a physical device or a properly configured emulator, not the web preview.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('[usePushNotifications] Permission not granted - notifications will not be delivered.');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn(
          '[usePushNotifications] No EAS projectId configured yet - run `eas init` in the mobile folder and sign in to your Expo account, then restart the app.'
        );
        return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!isMounted) return;

        tokenRef.current = token;
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
        await notificationService.registerToken(token, Platform.OS);
      } catch (err) {
        console.warn('[usePushNotifications] failed to get/register push token', err);
      }
    })();

    // Foreground: a system alert already shows (see setNotificationHandler above).
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Hook point for in-app toast/badge updates if desired later.
    });

    // Tapped (foreground, background, or from a killed state): navigate to
    // something relevant based on the data payload the backend attached.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      if (data.orderId) {
        navigation.navigate('Home'); // orders live in the web app for now; mobile has no Orders screen yet
      } else if (data.productId) {
        navigation.navigate('ProductDetails', { productId: data.productId });
      }
    });

    return () => {
      isMounted = false;
      receivedSub.remove();
      responseSub.remove();
    };
  }, [user, navigation]);

  // On logout, tell the backend to stop sending to this device.
  useEffect(() => {
    if (user) return undefined;
    return () => {
      if (tokenRef.current) {
        notificationService.unregisterToken(tokenRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}
