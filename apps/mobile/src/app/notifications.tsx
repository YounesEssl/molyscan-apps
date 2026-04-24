import React, { useCallback, useEffect } from 'react';
import { FlatList, Platform, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { COLORS, SPACING } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useNotificationStore } from '@/stores/notification.store';
import { notificationService } from '@/services/notification.service';
import type { AppNotification } from '@/schemas/notification.schema';

export default function NotificationsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, setNotifications } = useNotificationStore();

  useEffect(() => {
    notificationService.getAll().then(setNotifications).catch(() => {});
  }, [setNotifications]);

  const handleItemPress = useCallback(
    (id: string) => {
      notificationService.markAsRead(id).catch(() => {});
      markAsRead(id);
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    haptic.success();
    notificationService.markAllAsRead().catch(() => {});
    markAllAsRead();
  }, [markAllAsRead]);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleItemPress(item.id)}
      />
    ),
    [handleItemPress],
  );

  return (
    <ScreenWrapper padded={false}>
      <Header
        title={t('notifications.title')}
        showBack
        rightAction={
          unreadCount > 0
            ? {
                icon: <CheckCircle size={22} color={COLORS.text} />,
                onPress: handleMarkAllAsRead,
              }
            : undefined
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title={t('notifications.emptyState')} />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
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
