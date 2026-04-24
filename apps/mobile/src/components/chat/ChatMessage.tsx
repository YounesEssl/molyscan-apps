import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
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
        <RNText style={styles.assistantText}>
          {message.content}
          {message.isStreaming ? (
            <RNText style={styles.streamingDot}>{'  ●'}</RNText>
          ) : null}
        </RNText>
      </View>
    </View>
  );
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
  assistantText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  streamingDot: {
    color: colors.purple,
    fontSize: 12,
  },
});
