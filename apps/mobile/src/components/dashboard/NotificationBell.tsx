import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Bell } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';

interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  // notification store import is unchanged
  const { useNotificationStore } = require('@/stores/notification.store');
  const unreadCount = useNotificationStore((s: { unreadCount: number }) => s.unreadCount);

  return (
    <TouchableOpacity onPress={onPress} hitSlop={12}>
      <Bell size={24} color={colors.surface} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text variant="caption" color={colors.textOnRed} style={styles.badgeText}>
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
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
