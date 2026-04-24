import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import type { ChatMessage as ChatMessageModel } from '@/services/chatFree.service';

interface ChatMessageProps {
  message: ChatMessageModel;
}

export const ChatMessage = React.memo(function ChatMessage({
  message,
}: ChatMessageProps): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <View
        style={[styles.row, styles.rowRight]}
        accessibilityRole="text"
        accessibilityLabel={`Sent message: ${message.content}`}
      >
        <LinearGradient
          colors={[colors.redVivid, colors.red]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.user}
        >
          <RNText style={styles.userText}>{message.content}</RNText>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, styles.rowLeft]}
      accessibilityRole="text"
      accessibilityLabel={`Assistant reply: ${message.content}`}
    >
      <View style={styles.assistant}>
        <Markdown style={markdownStyles}>
          {message.content}
        </Markdown>
        {message.isStreaming ? (
          <RNText style={styles.streamingDot}>{'●'}</RNText>
        ) : null}
      </View>
    </View>
  );
});

const BASE_TEXT = {
  fontFamily: typography.fonts.sans,
  fontSize: 13.5,
  color: colors.ink,
  lineHeight: 20,
  letterSpacing: -0.1,
} as const;

const markdownStyles = StyleSheet.create({
  body: {
    ...BASE_TEXT,
    margin: 0,
  },
  paragraph: {
    ...BASE_TEXT,
    marginTop: 0,
    marginBottom: 6,
  },
  strong: {
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
  },
  em: {
    fontStyle: 'italic',
  },
  heading1: {
    fontFamily: typography.fonts.sansBold,
    fontSize: 17,
    color: colors.ink,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 24,
  },
  heading2: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 22,
  },
  heading3: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 6,
    marginBottom: 2,
    lineHeight: 20,
  },
  bullet_list: {
    marginBottom: 6,
  },
  ordered_list: {
    marginBottom: 6,
  },
  list_item: {
    ...BASE_TEXT,
    marginBottom: 2,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    ...BASE_TEXT,
    marginRight: 6,
    lineHeight: 20,
  },
  ordered_list_icon: {
    ...BASE_TEXT,
    fontFamily: typography.fonts.sansMedium,
    marginRight: 6,
    lineHeight: 20,
  },
  code_inline: {
    fontFamily: typography.fonts.mono,
    fontSize: 12,
    backgroundColor: colors.ink4,
    color: colors.ink,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    fontFamily: typography.fonts.mono,
    fontSize: 12,
    backgroundColor: colors.paper1,
    color: colors.ink,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.ink4,
  },
  code_block: {
    fontFamily: typography.fonts.mono,
    fontSize: 12,
    backgroundColor: colors.paper1,
    color: colors.ink,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.ink4,
  },
  blockquote: {
    backgroundColor: colors.paper1,
    borderLeftWidth: 3,
    borderLeftColor: colors.ink3,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 4,
  },
  hr: {
    backgroundColor: colors.ink4,
    height: 1,
    marginVertical: 8,
  },
  link: {
    color: colors.purple,
    textDecorationLine: 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.ink4,
    borderRadius: 6,
    marginVertical: 6,
  },
  th: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 12,
    padding: 6,
    backgroundColor: colors.paper1,
  },
  td: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    padding: 6,
  },
});

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  user: {
    maxWidth: '88%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  userText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13.5,
    color: '#fff',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  assistant: {
    maxWidth: '88%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.ink4,
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  streamingDot: {
    color: colors.purple,
    fontSize: 10,
    marginTop: 2,
  },
});
