import '@/i18n';
import { loadStoredLanguage } from '@/i18n';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { useOutbox } from '@/hooks/useOutbox';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionRestoration } from '@/hooks/useSessionRestoration';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/design/tokens/spacing';
import { COLORS } from '@/constants/theme';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AiDataConsentProvider } from '@/providers/AiDataConsentProvider';
function AppHooks(): null {
  useOutbox();
  usePushNotifications();
  useEffect(() => {
    loadStoredLanguage();
  }, []);
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { status, retry } = useSessionRestoration();
  const { t } = useTranslation();

  useEffect(() => {
    if (status !== 'ready' && !isAuthenticated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, status, router]);

  if (status !== 'ready' && !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl, gap: spacing.xxl, backgroundColor: COLORS.background }}>
        {status === 'loading' ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <Text accessibilityRole="alert" style={{ textAlign: 'center' }}>{t('auth.sessionUnavailable')}</Text>
            <Button label={t('common.retry')} onPress={retry} />
          </>
        )}
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
      <AiDataConsentProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="workflow" />
            <Stack.Screen name="export" />
            <Stack.Screen name="voice-note" />
            <Stack.Screen name="crm-credentials" />
            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthGuard>
      </AiDataConsentProvider>
    </View>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootContent />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
