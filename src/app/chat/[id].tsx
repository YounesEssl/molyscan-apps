import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/layout/Header';
import { Text } from '@/components/ui';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { chatService } from '@/services/chat.service';
import { MOCK_AI_CONVERSATIONS } from '@/mocks/chat.mock';
import type { AIMessage } from '@/schemas/chat.schema';

export default function ChatDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const listRef = useRef<FlatList>(null);
  const conversation = MOCK_AI_CONVERSATIONS.find((c) => c.id === id);

  useEffect(() => {
    if (id) {
      chatService.getMessages(id).then((msgs) => {
        setMessages(msgs);
        setShowSuggestions(msgs.length === 0 || msgs[msgs.length - 1]?.role === 'assistant');
      });
    }
  }, [id]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (text: string) => {
    if (!id) return;
    setShowSuggestions(false);
    setIsTyping(true);

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      conversationId: id,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToEnd();

    const { aiResponse } = await chatService.sendMessage(id, text);
    setMessages((prev) => [...prev, aiResponse]);
    setIsTyping(false);
    setShowSuggestions(true);
    scrollToEnd();
  };

  const headerTitle = conversation
    ? `${conversation.product.scannedName} → ${conversation.product.molydalName}`
    : 'Assistant IA';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={headerTitle} showBack />

      {/* AI badge */}
      <View style={styles.aiBadge}>
        <Ionicons name="sparkles" size={12} color={COLORS.accent} />
        <Text variant="caption" color={COLORS.accent} style={styles.aiBadgeText}>
          Assistant IA Molydal
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles" size={32} color={COLORS.accent} />
              </View>
              <Text variant="body" color={COLORS.textSecondary} style={styles.emptyText}>
                Posez une question sur l'équivalence produit
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {isTyping && (
                <View style={styles.typingRow}>
                  <View style={styles.typingAvatar}>
                    <Ionicons name="sparkles" size={14} color={COLORS.accent} />
                  </View>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text variant="caption" color={COLORS.textMuted}>
                      Réflexion en cours...
                    </Text>
                  </View>
                </View>
              )}
              {showSuggestions && !isTyping && (
                <SuggestedQuestions onSelect={handleSend} />
              )}
            </>
          }
        />
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.accent + '10',
  },
  aiBadgeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 240,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderBottomLeftRadius: 4,
  },
  bottomSafe: {
    backgroundColor: COLORS.surface,
  },
});
