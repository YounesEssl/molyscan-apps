import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    'TitilliumWeb-Regular': require('../../assets/fonts/TitilliumWeb-Regular.ttf'),
    'TitilliumWeb-SemiBold': require('../../assets/fonts/TitilliumWeb-SemiBold.ttf'),
    'TitilliumWeb-Bold': require('../../assets/fonts/TitilliumWeb-Bold.ttf'),
    'Raleway-Regular': require('../../assets/fonts/Raleway-Regular.ttf'),
    'Raleway-SemiBold': require('../../assets/fonts/Raleway-SemiBold.ttf'),
    'Raleway-Bold': require('../../assets/fonts/Raleway-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return <>{children}</>;
}
