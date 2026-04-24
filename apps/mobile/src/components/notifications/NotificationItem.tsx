import React, { useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Like } from 'react-native-solar-icons/icons/bold-duotone';
import { Dislike } from 'react-native-solar-icons/icons/bold-duotone';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { BranchingPathsDown } from 'react-native-solar-icons/icons/bold-duotone';
import { InfoCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { AppNotification } from '@/schemas/notification.schema';
import { formatRelativeDate } from '@/utils/date';

function getNotificationIcon(type: string, color: string, size: number): React.ReactNode {
  switch (type) {
    case 'scan_match':
      return <CheckCircle size={size} color={color} />;
    case 'price_approved':
      return <Like size={size} color={color} />;
    case 'price_rejected':
      return <Dislike size={size} color={color} />;
    case 'ai_response':
      return <Stars size={size} color={color} />;
    case 'workflow_update':
      return <BranchingPathsDown size={size} color={color} />;
    case 'system':
    default:
      return <InfoCircle size={size} color={color} />;
  }
}

const COLOR_MAP: Record<string, string> = {
  scan_match: COLORS.success,
  price_approved: COLORS.success,
  price_rejected: COLORS.danger,
  ai_response: COLORS.accent,
  workflow_update: '#2196F3',
  system: COLORS.textMuted,
};

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

export const NotificationItem = React.memo(function NotificationItem({
  notification,
  onPress,
}: NotificationItemProps): React.JSX.Element {
  const color = COLOR_MAP[notification.type] ?? COLORS.textMuted;

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  const accessibilityLabel = `${notification.read ? '' : 'Non lue. '}${notification.title}. ${notification.body}`;

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        {getNotificationIcon(notification.type, color, 20)}
      </View>
      <View style={styles.content}>
        <Text variant="body" style={!notification.read ? styles.boldTitle : undefined}>
          {notification.title}
        </Text>
        <Text variant="caption" color={COLORS.textSecondary} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text variant="caption" color={COLORS.textMuted} style={styles.time}>
          {formatRelativeDate(notification.createdAt)}
        </Text>
      </View>
      {!notification.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  unread: {
    backgroundColor: COLORS.accent + '08',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  boldTitle: {
    fontWeight: '700',
  },
  time: {
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
});
