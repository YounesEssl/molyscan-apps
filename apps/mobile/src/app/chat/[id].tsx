import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/layout/Header';
import { Text } from '@/components/ui';
import { ChatBubbleFree } from '@/components/chat/ChatBubbleFree';
import { ChatInputWithUpload } from '@/components/chat/ChatInputWithUpload';
import { FreeChatSuggestions } from '@/components/chat/FreeChatSuggestions';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { chatFreeService, type ChatMessage } from '@/services/chatFree.service';

export default function ChatDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('Assistant IA');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    chatFreeService.getMessages(id).then((msgs) => {
      setMessages(msgs);
    }).catch(() => {});
  }, [id]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !id) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };
    const assistantId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsLoading(true);
    scrollToEnd();

    // Update title from first message
    if (messages.length === 0) {
      const newTitle = text.length > 40 ? text.slice(0, 40) + '...' : text;
      setTitle(newTitle);
    }

    let fullContent = '';

    await chatFreeService.sendMessageStreaming(id, text.trim(), {
      onToken: (token) => {
        fullContent += token;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m,
          ),
        );
        scrollToEnd();
      },
      onSources: (sources) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, sources } : m,
          ),
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsLoading(false);
      },
      onError: (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Erreur : ${error}`, isStreaming: false }
              : m,
          ),
        );
        setIsLoading(false);
      },
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={title} showBack />

      {/* AI badge */}
      <View style={styles.aiBadge}>
        <Stars size={12} color={COLORS.accent} />
        <Text variant="caption" color={COLORS.accent} style={styles.aiBadgeText}>
          Powered by AI
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
          renderItem={({ item }) => <ChatBubbleFree message={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Stars size={36} color={COLORS.accent} />
              </View>
              <Text variant="subheading" style={styles.emptyTitle}>
                Comment puis-je vous aider ?
              </Text>
              <Text
                variant="caption"
                color={COLORS.textSecondary}
                style={styles.emptySubtitle}
              >
                Posez une question sur les lubrifiants, graisses ou huiles Molydal
              </Text>
              <FreeChatSuggestions onSelect={handleSend} />
            </View>
          }
          ListFooterComponent={
            isLoading && !messages.some((m) => m.isStreaming) ? (
              <View style={styles.typingRow}>
                <View style={styles.typingAvatar}>
                  <Stars size={14} color={COLORS.accent} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text variant="caption" color={COLORS.textMuted}>
                    Réflexion en cours...
                  </Text>
                </View>
              </View>
            ) : null
          }
        />
        <ChatInputWithUpload onSend={handleSend} disabled={isLoading} />
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
  flex: { flex: 1 },
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
    paddingTop: 40,
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: SPACING.md,
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
