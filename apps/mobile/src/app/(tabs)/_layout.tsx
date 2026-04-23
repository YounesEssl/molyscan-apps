import React from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home2 } from 'react-native-solar-icons/icons/bold-duotone';
import { QrCode } from 'react-native-solar-icons/icons/bold-duotone';
import { ClockCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { UserCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';

export default function TabsLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          height: 64 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 10,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          ...shadows.lg,
        } as ViewStyle,
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: '600',
          fontFamily: typography.fonts.displaySemibold,
          marginTop: 2,
        },
        tabBarItemStyle: {
          gap: 4,
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <Home2 size={focused ? 24 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('tabs.scanner'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <QrCode size={focused ? 26 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <ClockCircle size={focused ? 24 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.assistant'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <ChatRoundDots size={focused ? 24 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <UserCircle size={focused ? 24 : 22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: colors.redDim,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});
