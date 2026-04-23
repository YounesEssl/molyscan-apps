import React, { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Alert,
  type ViewStyle,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { AddCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { TrashBinMinimalistic } from 'react-native-solar-icons/icons/bold';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, SearchBar, EmptyState } from '@/components/ui';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { chatFreeService, type ChatConversation } from '@/services/chatFree.service';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ChatHubScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const TAB_BAR_HEIGHT = 64 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await chatFreeService.getConversations();
      setConversations(convs);
    } catch {
      // silently fail — may not be authenticated yet
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const handleNewConversation = async () => {
    try {
      setLoading(true);
      const conv = await chatFreeService.createConversation();
      router.push(`/chat/${conv.id}`);
    } catch {
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (conv: ChatConversation) => {
    Alert.alert(
      'Supprimer',
      `Supprimer « ${conv.title} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await chatFreeService.deleteConversation(conv.id);
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          },
        },
      ],
    );
  };

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Stars size={24} color={COLORS.accent} />
            <Text variant="heading">Assistant IA</Text>
          </View>
          <TouchableOpacity
            style={[styles.newButton, SHADOW.redSm as ViewStyle]}
            onPress={handleNewConversation}
            disabled={loading}
            activeOpacity={0.8}
          >
            <AddCircle size={20} color="#fff" />
            <Text variant="caption" color="#fff" style={styles.newButtonText}>
              Nouveau
            </Text>
          </TouchableOpacity>
        </View>
        <Text variant="caption" color={COLORS.textSecondary}>
          Posez vos questions sur les lubrifiants Molydal
        </Text>
      </View>

      {/* Search */}
      {conversations.length > 3 && (
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une conversation..."
          />
        </View>
      )}

      {/* Conversation list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, SHADOW.sm as ViewStyle]}
            onPress={() => router.push(`/chat/${item.id}`)}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIcon, item.type === 'product' && styles.cardIconProduct]}>
              <Stars size={18} color={item.type === 'product' ? COLORS.primary : COLORS.accent} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text variant="body" style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" color={COLORS.textMuted} style={styles.cardTime}>
                  {timeAgo(item.updatedAt)}
                </Text>
              </View>
              {item.type === 'product' && item.product && (
                <Text variant="caption" color={COLORS.accent} numberOfLines={1}>
                  → {item.product.molydalName}
                </Text>
              )}
              {item.lastMessage && (
                <Text
                  variant="caption"
                  color={COLORS.textSecondary}
                  numberOfLines={1}
                  style={styles.cardPreview}
                >
                  {item.lastMessage.role === 'user' ? 'Vous : ' : 'IA : '}
                  {item.lastMessage.text}
                </Text>
              )}
              {!item.lastMessage && (
                <Text variant="caption" color={COLORS.textMuted} style={styles.cardPreview}>
                  Conversation vide — commencez à discuter
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon={<Stars size={36} color={COLORS.textMuted} />}
              title="Aucune conversation"
              subtitle="Appuyez sur « Nouveau » pour poser votre première question à l'assistant IA Molydal"
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  newButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.lg,
  },
  separator: {
    height: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconProduct: {
    backgroundColor: COLORS.primary + '12',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    fontWeight: '700',
    flex: 1,
  },
  cardTime: {
    fontSize: 11,
  },
  cardPreview: {
    marginTop: 2,
  },
  empty: {
    paddingTop: 80,
  },
});
