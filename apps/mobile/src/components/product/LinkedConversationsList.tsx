import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import type { ScanLinkedConversation } from '@/services/scan.service';

interface LinkedConversationsListProps {
  conversations: ScanLinkedConversation[];
}

function formatRelativeDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function LinkedConversationsList({
  conversations,
}: LinkedConversationsListProps): React.JSX.Element | null {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  if (conversations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="label" color={colors.ink2} style={styles.title}>
        {t('product.linkedConversations')}
      </Text>
      {conversations.map((conv) => {
        const preview = conv.lastMessage?.text || t('product.linkedConversationsNoMessages');
        const displayTitle = conv.title || conv.scannedName || t('chat.detailDefaultTitle');
        return (
          <Pressable
            key={conv.id}
            onPress={() => router.push(`/chat/${conv.id}`)}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={displayTitle}
          >
            <Card variant="outlined" style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <ChatRoundDots size={20} color={colors.red} />
                </View>
                <View style={styles.body}>
                  <Text variant="subheading" numberOfLines={1}>
                    {displayTitle}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.ink2}
                    numberOfLines={1}
                    style={styles.preview}
                  >
                    {preview}
                  </Text>
                  <Text variant="caption" color={colors.ink3} style={styles.meta}>
                    {t('product.linkedConversationsMessages', { count: conv.messageCount })}
                    {' · '}
                    {formatRelativeDate(conv.updatedAt, i18n.language)}
                  </Text>
                </View>
                <AltArrowRight size={18} color={colors.ink3} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.section,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  pressable: {
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(232,119,34,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  preview: {
    lineHeight: 16,
  },
  meta: {
    marginTop: 2,
  },
});
