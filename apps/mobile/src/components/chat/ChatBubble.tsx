import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import type { AIMessage } from '@/schemas/chat.schema';

interface ChatBubbleProps {
  message: AIMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color={COLORS.accent} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text variant="body" color={isUser ? COLORS.surface : COLORS.text}>
          {message.text}
        </Text>
        {message.sources && message.sources.length > 0 && (
          <View style={styles.sources}>
            <Ionicons name="document-text-outline" size={12} color={COLORS.textMuted} />
            <Text variant="caption" color={COLORS.textMuted} style={styles.sourcesText}>
              {message.sources.join(' · ')}
            </Text>
          </View>
        )}
        <Text
          variant="caption"
          color={isUser ? 'rgba(255,255,255,0.6)' : COLORS.textMuted}
          style={styles.time}
        >
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '76%',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  sources: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  sourcesText: {
    fontSize: 11,
    flex: 1,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});
