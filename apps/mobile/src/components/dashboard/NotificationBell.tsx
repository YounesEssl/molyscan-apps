import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, RADIUS } from '@/constants/theme';
import { useNotificationStore } from '@/stores/notification.store';

interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity onPress={onPress} hitSlop={12}>
      <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text variant="caption" color={COLORS.surface} style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
