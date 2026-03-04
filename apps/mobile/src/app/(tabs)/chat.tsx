import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, SearchBar, EmptyState } from '@/components/ui';
import { ConversationCard } from '@/components/chat/ConversationCard';
import { COLORS, SPACING } from '@/constants/theme';
import { chatService } from '@/services/chat.service';
import type { AIConversation } from '@/schemas/chat.schema';
import { useTranslation } from 'react-i18next';

export default function AssistantScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    chatService.getConversations().then(setConversations);
  }, []);

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.product.scannedName.toLowerCase().includes(search.toLowerCase()) ||
        c.product.molydalName.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <ScreenWrapper padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="sparkles" size={22} color={COLORS.accent} />
          <Text variant="heading">{t('chat.aiAssistant')}</Text>
        </View>
        <Text variant="caption" color={COLORS.textSecondary}>
          {t('chat.aiSubtitle')}
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('chat.searchProduct')} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="sparkles-outline"
            title={t('chat.noConversation')}
            subtitle={t('chat.noConversationSubtitle')}
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.sm,
  },
});
