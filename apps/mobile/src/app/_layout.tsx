import '@/i18n';
import { loadStoredLanguage } from '@/i18n';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { queryClient } from '@/lib/queryClient';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { storage } from '@/lib/storage';
import { COLORS } from '@/constants/theme';
import { ThemeProvider } from '@/providers/ThemeProvider';
function AppHooks(): null {
  useNetworkStatus();
  useSync();
  usePushNotifications();
  useEffect(() => {
    loadStoredLanguage();
  }, []);
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getToken();
        if (token && !isAuthenticated) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          try {
            const me = await authService.getMe({ signal: controller.signal });
            setUser(me);
          } finally {
            clearTimeout(timeout);
          }
        }
      } catch {
        await storage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootContent(): React.JSX.Element {
  return (
    <View style={{ flex: 1 }}>
      <AppHooks />
      <OfflineBanner />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="workflow" />
          <Stack.Screen name="export" />
          <Stack.Screen name="voice-note" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthGuard>
    </View>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <StatusBar style="dark" />
            <RootContent />
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
