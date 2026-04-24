import * as Haptics from 'expo-haptics';

/**
 * Centralized haptic feedback wrapper. Use semantic names, never call
 * expo-haptics directly from screens.
 *
 * iOS has the Taptic Engine, Android uses the generic vibrator. The wrapper
 * no-ops silently on web and handles unavailable hardware.
 */
export const haptic = {
  /** Light tap — tab switch, toggle, selection change */
  light: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Medium tap — primary button press, card tap */
  medium: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Heavy tap — destructive action confirm, capture */
  heavy: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** Selection change — picker, segmented control */
  selection: (): void => {
    void Haptics.selectionAsync().catch(() => {});
  },
  /** Success — task completed, scan matched */
  success: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Warning — validation failed, careful action */
  warning: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  /** Error — crash, request failed */
  error: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
