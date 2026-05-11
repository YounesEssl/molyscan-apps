import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { EmptyState } from '@/components/ui/EmptyState';
import { Aura } from '@/components/ui/Aura';
import { ChatHubHeader } from '@/components/chat/ChatHubHeader';
import { ChatHubCard } from '@/components/chat/ChatHubCard';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { haptic } from '@/lib/haptics';
import {
  chatFreeService,
  type ChatConversation,
} from '@/services/chatFree.service';

export default function ChatHubScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const { contentPaddingBottom } = useTabBarSpacing();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await chatFreeService.getConversations();
      setConversations(convs);
    } catch {
      // silently fail
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const convs = await chatFreeService.getConversations();
      setConversations(convs);
    } catch {
      // fail silently, user can retry
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleNewConversation = async (): Promise<void> => {
    try {
      setLoading(true);
      haptic.medium();
      const conv = await chatFreeService.createConversation();
      router.push(`/chat/${conv.id}`);
    } catch {
      Alert.alert(t('chat.newConvErrorTitle'), t('chat.newConvError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (conv: ChatConversation): void => {
    Alert.alert(
      t('chat.deleteTitle'),
      t('chat.deleteConfirm', { title: conv.title }),
      [
        { text: t('chat.deleteCancel'), style: 'cancel' },
        {
          text: t('chat.deleteAction'),
          style: 'destructive',
          onPress: async () => {
            await chatFreeService.deleteConversation(conv.id);
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          },
        },
      ],
    );
  };

  const handleCardPress = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatConversation }) => (
      <ChatHubCard
        conversation={item}
        onPress={() => handleCardPress(item.id)}
        onLongPress={() => handleDelete(item)}
      />
    ),
    [handleCardPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Aura
        width={400}
        height={400}
        color={colors.purple}
        opacity={0.12}
        style={{ top: -100, right: -100 }}
      />

      <ChatHubHeader
        onNewPress={handleNewConversation}
        disabled={loading}
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: contentPaddingBottom },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon={<Stars size={36} color={colors.ink3} />}
              title={t('chat.noConversationsHubTitle')}
              subtitle={t('chat.noConversationsHubSub')}
            />
          </View>
        }
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.red}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
  },
  list: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  empty: {
    paddingTop: 80,
  },
});
