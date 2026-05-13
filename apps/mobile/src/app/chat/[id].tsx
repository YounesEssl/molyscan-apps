import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aura } from '@/components/ui/Aura';
import { AssistantHeader } from '@/components/chat/AssistantHeader';
import { AssistantAvatar } from '@/components/chat/AssistantAvatar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatTypingIndicator } from '@/components/chat/ChatTypingIndicator';
import { ScanContextCard } from '@/components/chat/ScanContextCard';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import {
  chatFreeService,
  type ChatMessage as ChatMessageModel,
  type ScanContext,
} from '@/services/chatFree.service';
import { useFileAttachment } from '@/hooks/useFileAttachment';

export default function ChatDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessageModel>>(null);

  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [scanContext, setScanContext] = useState<ScanContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(t('chat.detailDefaultTitle'));
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const fileAttachment = useFileAttachment();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      chatFreeService.getMessages(id),
      chatFreeService.getConversationById(id),
    ])
      .then(([msgs, conv]) => {
        setMessages(msgs);
        if (conv.title && conv.title !== 'Nouvelle conversation') {
          setTitle(conv.title);
        }
        setScanContext(conv.scanContext ?? null);
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

    const messageText = trimmed || t('chat.analyzeDocument');
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
              ? { ...m, content: t('chat.streamingError', { message: error }), isStreaming: false }
              : m,
          ),
        );
        setIsLoading(false);
      },
    }, attachmentId);
  };

  const handleSubmitForAnalysis = useCallback(() => {
    if (!id || submitting || submitted) return;

    Alert.alert(
      t('chat.submitConfirmTitle'),
      t('chat.submitConfirmBody'),
      [
        { text: t('chat.submitConfirmCancel'), style: 'cancel' },
        {
          text: t('chat.submitConfirmSend'),
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await chatFreeService.submitConversation(id);
              setSubmitted(true);
              Alert.alert(t('chat.submitDoneTitle'), t('chat.submitDoneBody'));
            } catch {
              Alert.alert(
                t('chat.submitErrorTitle'),
                t('chat.submitErrorBody'),
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [id, submitting, submitted, t]);

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
        <AssistantHeader
          title={title}
          onBack={() => router.back()}
          onSubmitForAnalysis={handleSubmitForAnalysis}
          submitting={submitting}
          submitted={submitted}
        />
        <AssistantAvatar />
      </SafeAreaView>

      {/* "pan" mode: OS pans the whole screen above the keyboard.
          KAV only needed on iOS where the OS does not pan automatically. */}
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
          ListHeaderComponent={
            scanContext ? <ScanContextCard context={scanContext} /> : null
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

        {/* When keyboard is shown, OS already panned the screen up — no bottom padding needed. */}
        <View style={{ paddingBottom: keyboardShown ? 0 : insets.bottom }}>
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
