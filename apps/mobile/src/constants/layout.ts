import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  screenWidth: width,
  screenHeight: height,
} as const;

// Tab bar — single source of truth for the floating pill tab bar
export const TAB_BAR = {
  height: 64,
  bottomOffset: 24,       // distance from screen bottom
  sideOffset: 16,         // distance from screen sides
  contentClearance: 16,   // breathing room between screen content and tab bar
  borderRadius: 28,
} as const;
