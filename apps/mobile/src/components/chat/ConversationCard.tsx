import React from 'react';
import { TouchableOpacity, View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import type { AIConversation } from '@/schemas/chat.schema';
import { formatRelativeDate } from '@/utils/date';

interface ConversationCardProps {
  conversation: AIConversation;
  onPress: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  onPress,
}) => {
  const lastMsg = conversation.messages[conversation.messages.length - 1];

  return (
    <TouchableOpacity style={[styles.card, SHADOW.sm as ViewStyle]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.aiIcon}>
        <Ionicons name="sparkles" size={20} color={COLORS.accent} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text variant="body" style={styles.productName} numberOfLines={1}>
            {conversation.product.scannedName}
          </Text>
          {lastMsg && (
            <Text variant="caption" color={COLORS.textMuted}>
              {formatRelativeDate(lastMsg.timestamp)}
            </Text>
          )}
        </View>
        <Text variant="caption" color={COLORS.accent} numberOfLines={1}>
          → {conversation.product.molydalName}
        </Text>
        {lastMsg && (
          <Text variant="caption" color={COLORS.textSecondary} numberOfLines={1} style={styles.preview}>
            {lastMsg.role === 'user' ? 'Vous : ' : 'IA : '}
            {lastMsg.text}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontWeight: '700',
    flex: 1,
    marginRight: SPACING.sm,
  },
  preview: {
    marginTop: 2,
  },
});
