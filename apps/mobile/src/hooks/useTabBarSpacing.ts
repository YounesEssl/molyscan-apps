import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR } from '@/constants/layout';

/**
 * Single source of truth for spacing that accounts for the floating tab bar.
 *
 * - `tabBarBottom` — distance from screen bottom where the tab bar sits
 * - `contentPaddingBottom` — padding that scroll content must add so nothing is hidden
 */
export function useTabBarSpacing(): {
  tabBarBottom: number;
  contentPaddingBottom: number;
} {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  const tabBarBottom = TAB_BAR.bottomOffset + safeBottom;
  const contentPaddingBottom =
    TAB_BAR.height + TAB_BAR.bottomOffset + safeBottom + TAB_BAR.contentClearance;

  return { tabBarBottom, contentPaddingBottom };
}
