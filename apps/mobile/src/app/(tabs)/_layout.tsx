import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home2 } from 'react-native-solar-icons/icons/bold-duotone';
import { ClockCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { UserCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Camera } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

const TAB_LABELS: Record<string, string> = {
  index:   'Accueil',
  history: 'Historique',
  scanner: '',
  chat:    'Assistant',
  profile: 'Profil',
};

const TAB_ICONS: Record<string, React.FC<{ color: string }>> = {
  index:   ({ color }) => <Home2     size={22} color={color} />,
  history: ({ color }) => <ClockCircle size={22} color={color} />,
  chat:    ({ color }) => <ChatRoundDots size={22} color={color} />,
  profile: ({ color }) => <UserCircle size={22} color={color} />,
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottom = 24 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <View
      style={[
        styles.tabBar,
        {
          bottom,
          shadowColor: '#3c2814',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.20,
          shadowRadius: 28,
          elevation: 12,
        } as ViewStyle,
      ]}
      pointerEvents="box-none"
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isScanner = route.name === 'scanner';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isScanner) {
          return (
            <View key={route.key} style={styles.tabItem}>
              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  router.push('/(tabs)/scanner');
                }}
                activeOpacity={0.85}
                style={styles.scanBtn}
                accessibilityRole="button"
                accessibilityLabel="Scanner un produit"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LinearGradient
                  colors={[colors.redVivid, colors.redStart, colors.red]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Camera size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        }

        const IconComp = TAB_ICONS[route.name];
        const label = TAB_LABELS[route.name] ?? route.name;
        const color = isFocused ? colors.ink : colors.ink3;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              haptic.light();
              onPress();
            }}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {IconComp && <IconComp color={color} />}
            <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? '600' : '500' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 28,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    letterSpacing: -0.1,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});
