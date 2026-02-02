import React from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function AppHooks(): null {
  useNetworkStatus();
  useSync();
  usePushNotifications();
  return null;
}

export default function RootLayout(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppHooks />
      <OfflineBanner />
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
    </QueryClientProvider>
  );
}
