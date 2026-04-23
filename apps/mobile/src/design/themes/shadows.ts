import { Platform } from 'react-native';
import type { ThemeShadows } from '../types';

export function buildShadows(
  shadowColor: string,
  accentColor: string,
  primaryColor: string,
): ThemeShadows {
  return {
    sm: Platform.select({
      ios: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }) as Record<string, unknown>,
    md: Platform.select({
      ios: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      default: {},
    }) as Record<string, unknown>,
    lg: Platform.select({
      ios: { shadowColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 8 },
      default: {},
    }) as Record<string, unknown>,
    accent: Platform.select({
      ios: { shadowColor: accentColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
      default: {},
    }) as Record<string, unknown>,
    primary: Platform.select({
      ios: { shadowColor: primaryColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 10 },
      default: {},
    }) as Record<string, unknown>,
  };
}
