import React from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export default function RootLayout(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
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
