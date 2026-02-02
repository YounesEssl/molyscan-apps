import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import type { AppNotification } from '@/schemas/notification.schema';
import { formatRelativeDate } from '@/utils/date';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  scan_match: 'checkmark-circle',
  price_approved: 'thumbs-up',
  price_rejected: 'thumbs-down',
  ai_response: 'sparkles',
  workflow_update: 'git-branch',
  system: 'information-circle',
};

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

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const icon = ICON_MAP[notification.type] ?? 'ellipse';
  const color = COLOR_MAP[notification.type] ?? COLORS.textMuted;

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
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
};

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
