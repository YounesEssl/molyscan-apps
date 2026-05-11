import React, { useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { shadows } from '@/design/tokens/shadows';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';
import type { ChatConversation } from '@/services/chatFree.service';

interface ChatHubCardProps {
  conversation: ChatConversation;
  onPress: () => void;
  onLongPress?: () => void;
}

function timeAgo(dateStr: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('common.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('common.daysAgo', { count: days });
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

export const ChatHubCard = React.memo(function ChatHubCard({
  conversation,
  onPress,
  onLongPress,
}: ChatHubCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      haptic.medium();
      onLongPress();
    }
  }, [onLongPress]);

  return (
    <TouchableOpacity
      style={[styles.card, shadows.card as ViewStyle]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('chat.cardA11y', { title: conversation.title })}
      accessibilityHint={t('chat.cardA11yHint')}
    >
      <LinearGradient
        colors={[colors.purpleVivid, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Stars size={16} color="#fff" />
      </LinearGradient>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            variant="body"
            style={styles.title}
            numberOfLines={1}
          >
            {conversation.title}
          </Text>
          <Text
            variant="caption"
            color={colors.ink3}
            style={styles.time}
          >
            {timeAgo(conversation.updatedAt, t)}
          </Text>
        </View>
        {conversation.type === 'product' && conversation.product ? (
          <Text variant="caption" color={colors.red} numberOfLines={1}>
            → {conversation.product.molydalName}
          </Text>
        ) : null}
        {conversation.lastMessage ? (
          <Text
            variant="caption"
            color={colors.ink2}
            numberOfLines={1}
            style={styles.preview}
          >
            {conversation.lastMessage.role === 'user'
              ? t('chat.convYouPrefix')
              : t('chat.convAIPrefix')}
            {conversation.lastMessage.text}
          </Text>
        ) : (
          <Text
            variant="caption"
            color={colors.ink3}
            style={styles.preview}
          >
            {t('chat.emptyConversationPreview')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.paper2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.06)',
  } as ViewStyle,
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b2dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.sansSemibold,
    flex: 1,
  },
  time: {
    fontSize: typography.sizes.xs,
  },
  preview: {
    marginTop: 2,
  },
});
