import React from 'react';
import { View, StyleSheet, type TextStyle } from 'react-native';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { DocumentText } from 'react-native-solar-icons/icons/bold-duotone';
import Markdown from 'react-native-markdown-display';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import type { ChatMessage } from '@/services/chatFree.service';

interface ChatBubbleFreeProps {
  message: ChatMessage;
}

export const ChatBubbleFree: React.FC<ChatBubbleFreeProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Stars size={14} color={COLORS.accent} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {isUser ? (
          <Text variant="body" color="#fff" style={styles.userText}>
            {message.content}
          </Text>
        ) : (
          <View style={styles.mdWrap}>
            <Markdown style={md} mergeStyle>
              {message.content || ' '}
            </Markdown>
            {message.isStreaming && <View style={styles.cursor} />}
          </View>
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <View style={styles.sources}>
            <DocumentText size={11} color={COLORS.textMuted} />
            <Text variant="caption" color={COLORS.textMuted} style={styles.sourcesText}>
              {message.sources.join(' · ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Markdown styles — compact for chat bubbles ────────────────────
const baseFontSize = 14;
const smallFontSize = 12;
const textColor = COLORS.text;

const md = StyleSheet.create({
  // Root
  body: {
    color: textColor,
    fontSize: baseFontSize,
    lineHeight: 20,
  } as TextStyle,

  // Paragraphs — tight spacing
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },

  // Headings — small, inline-feeling
  heading1: {
    fontSize: 16,
    fontWeight: '700',
    color: textColor,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 22,
  } as TextStyle,
  heading2: {
    fontSize: 15,
    fontWeight: '700',
    color: textColor,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 21,
  } as TextStyle,
  heading3: {
    fontSize: baseFontSize,
    fontWeight: '700',
    color: textColor,
    marginTop: 6,
    marginBottom: 2,
    lineHeight: 20,
  } as TextStyle,

  // Inline
  strong: {
    fontWeight: '700',
    color: textColor,
  } as TextStyle,
  em: {
    fontStyle: 'italic',
  } as TextStyle,
  link: {
    color: COLORS.accent,
    textDecorationLine: 'underline',
  } as TextStyle,
  code_inline: {
    backgroundColor: COLORS.background,
    color: COLORS.accent,
    fontSize: smallFontSize,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  } as TextStyle,

  // Lists
  bullet_list: {
    marginTop: 2,
    marginBottom: 6,
  },
  ordered_list: {
    marginTop: 2,
    marginBottom: 6,
  },
  list_item: {
    marginVertical: 1,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    color: COLORS.accent,
    fontSize: baseFontSize,
    lineHeight: 20,
    marginRight: 6,
  } as TextStyle,
  ordered_list_icon: {
    color: COLORS.textSecondary,
    fontSize: smallFontSize,
    lineHeight: 20,
    marginRight: 6,
  } as TextStyle,
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_content: {
    flex: 1,
  },

  // Table — clean & compact
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: COLORS.background,
  },
  th: {
    padding: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  td: {
    padding: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  tr: {
    flexDirection: 'row',
  },

  // Blockquote
  blockquote: {
    backgroundColor: COLORS.accent + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 6,
    borderRadius: 4,
  },

  // Horizontal rule
  hr: {
    backgroundColor: COLORS.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  // Code blocks
  fence: {
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
    fontSize: smallFontSize,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: textColor,
    lineHeight: 18,
  } as TextStyle,
  code_block: {
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
    fontSize: smallFontSize,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: textColor,
  } as TextStyle,
});

// Platform import for font family
import { Platform } from 'react-native';

// ── Component styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  userText: {
    fontSize: baseFontSize,
    lineHeight: 20,
  },
  mdWrap: {
    marginVertical: -4,
  },
  cursor: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.accent,
    opacity: 0.6,
    borderRadius: 1,
    marginTop: 2,
  },
  sources: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  sourcesText: {
    fontSize: 11,
    flex: 1,
  },
});
