import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

/**
 * expo-notifications throws at module-evaluation time inside Expo Go (SDK 53+).
 * We detect Expo Go and skip the entire feature — push will only work in
 * a development build or production.
 */
const isExpoGo = Constants.appOwnership === 'expo';

async function loadNotificationsModule() {
  if (isExpoGo) return null;
  // Dynamic import so the module is never evaluated in Expo Go
  return await import('expo-notifications');
}

async function loadDeviceModule() {
  if (isExpoGo) return null;
  return await import('expo-device');
}

let handlerConfigured = false;

export function usePushNotifications(): void {
  const router = useRouter();
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (isExpoGo) {
      console.log('[Push] Skipped — not supported in Expo Go');
      return;
    }

    let cancelled = false;

    (async () => {
      const Notifications = await loadNotificationsModule();
      const Device = await loadDeviceModule();
      if (!Notifications || !Device || cancelled) return;

      // Configure foreground handler once
      if (!handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        handlerConfigured = true;
      }

      // Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MolyScan',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E87722',
        });
      }

      // Register push token
      if (Device.isDevice) {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          try {
            const { data: token } = await Notifications.getExpoPushTokenAsync({
              projectId: projectId as string,
            });
            console.log('[Push] Token:', token);
          } catch (e) {
            console.log('[Push] Token error:', e);
          }
        }
      }

      if (cancelled) return;

      // Listeners
      notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
        console.log('[Push] Foreground:', n.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((r) => {
        const data = r.notification.request.content.data;
        if (data?.type === 'product' && data?.id) {
          router.push(`/product/${data.id}`);
        } else if (data?.type === 'workflow' && data?.id) {
          router.push(`/workflow/${data.id}`);
        } else if (data?.type === 'chat' && data?.id) {
          router.push(`/chat/${data.id}`);
        } else {
          router.push('/notifications');
        }
      });
    })();

    return () => {
      cancelled = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}
