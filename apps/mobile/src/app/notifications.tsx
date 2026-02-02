import React, { useEffect } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, EmptyState } from '@/components/ui';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { COLORS, SPACING } from '@/constants/theme';
import { useNotificationStore } from '@/stores/notification.store';
import { notificationService } from '@/services/notification.service';

export default function NotificationsScreen(): React.JSX.Element {
  const { notifications, unreadCount, markAsRead, markAllAsRead, setNotifications } = useNotificationStore();

  useEffect(() => {
    notificationService.getAll().then(setNotifications).catch(() => {});
  }, []);

  return (
    <ScreenWrapper padded={false}>
      <Header
        title="Notifications"
        showBack
        rightAction={
          unreadCount > 0
            ? { icon: 'checkmark-done' as const, onPress: () => { notificationService.markAllAsRead().catch(() => {}); markAllAsRead(); } }
            : undefined
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => { notificationService.markAsRead(item.id).catch(() => {}); markAsRead(item.id); }}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title="Aucune notification" />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.sm,
  },
});
