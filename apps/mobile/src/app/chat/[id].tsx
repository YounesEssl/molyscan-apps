import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aura } from '@/components/ui/Aura';
import { AssistantHeader } from '@/components/chat/AssistantHeader';
import { AssistantAvatar } from '@/components/chat/AssistantAvatar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatTypingIndicator } from '@/components/chat/ChatTypingIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import {
  chatFreeService,
  type ChatMessage as ChatMessageModel,
} from '@/services/chatFree.service';
import { useFileAttachment } from '@/hooks/useFileAttachment';

export default function ChatDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessageModel>>(null);

  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('AI Assistant');
  const [inputText, setInputText] = useState('');
  const fileAttachment = useFileAttachment();

  useEffect(() => {
    if (!id) return;
    chatFreeService
      .getMessages(id)
      .then((msgs) => {
        setMessages(msgs);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
      })
      .catch(() => {});
  }, [id]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    const hasAttachment = !!fileAttachment.attachment;
    if ((!trimmed && !hasAttachment) || isLoading || !id) return;
    setInputText('');

    const displayContent = trimmed || (hasAttachment ? `📄 ${fileAttachment.attachment!.name}` : '');
    const userMsg: ChatMessageModel = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayContent,
    };
    const assistantId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsLoading(true);
    scrollToEnd();

    if (messages.length === 0) {
      const titleSource = trimmed || displayContent;
      setTitle(titleSource.length > 40 ? `${titleSource.slice(0, 40)}...` : titleSource);
    }

    let fullContent = '';

    const attachmentId = fileAttachment.attachment?.id;
    fileAttachment.clear();

    const messageText = trimmed || 'Analyse ce document.';
    await chatFreeService.sendMessageStreaming(id, messageText, {
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
          prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)),
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
              ? { ...m, content: `Error: ${error}`, isStreaming: false }
              : m,
          ),
        );
        setIsLoading(false);
      },
    }, attachmentId);
  };

  const showTyping = isLoading && !messages.some((m) => m.isStreaming);

  const renderItem = useCallback<ListRenderItem<ChatMessageModel>>(
    ({ item }) => <ChatMessage message={item} />,
    [],
  );

  return (
    <View style={styles.container}>
      <Aura
        width={300}
        height={300}
        color={colors.purple}
        opacity={0.08}
        style={{ top: -80, right: -80 }}
      />

      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <AssistantHeader title={title} onBack={() => router.back()} />
        <AssistantAvatar />
      </SafeAreaView>

      {/* On Android, softwareKeyboardLayoutMode="pan" handles keyboard avoidance
          natively — KeyboardAvoidingView overcorrects and fails to restore position. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <ChatEmptyState onSuggestionSelect={handleSend} />
          }
          ListFooterComponent={showTyping ? <ChatTypingIndicator /> : null}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
        />

        <View style={{ paddingBottom: insets.bottom }}>
          <ChatComposer
            value={inputText}
            onChangeText={setInputText}
            onSubmit={() => handleSend(inputText)}
            disabled={isLoading}
            onAddPress={() => void fileAttachment.pick()}
            attachment={fileAttachment.attachment}
            attachmentUploading={fileAttachment.uploading}
            onRemoveAttachment={fileAttachment.clear}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
  },
  safeTop: {
    zIndex: 10,
  },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: 8,
    flexGrow: 1,
  },
});
