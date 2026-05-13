import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';
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
    <View style={styles.section}>
      {conversations.map((conv) => {
        const preview = conv.lastMessage?.text || t('product.linkedConversationsNoMessages');
        const displayTitle = conv.title || conv.scannedName || t('chat.detailDefaultTitle');
        const meta = `${t('product.linkedConversationsMessages', { count: conv.messageCount })} · ${formatRelativeDate(conv.updatedAt, i18n.language)}`;

        return (
          <Pressable
            key={conv.id}
            onPress={() => {
              haptic.light();
              router.push(`/chat/${conv.id}`);
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={displayTitle}
          >
            <LinearGradient
              colors={['#f0ecff', '#ebe4ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[colors.purpleVivid, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBox}
            >
              <ChatRoundDots size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.body}>
              <RNText style={styles.title} numberOfLines={1}>{displayTitle}</RNText>
              <RNText style={styles.preview} numberOfLines={1}>{preview}</RNText>
              <RNText style={styles.meta}>{meta}</RNText>
            </View>
            <AltArrowRight size={16} color={colors.ink3} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginTop: 20,
    gap: spacing.sm,
  },
  card: {
    padding: 16,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(91,45,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  pressed: {
    opacity: 0.75,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 4,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  preview: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    color: colors.ink2,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    color: colors.ink3,
    marginTop: 1,
  },
});
