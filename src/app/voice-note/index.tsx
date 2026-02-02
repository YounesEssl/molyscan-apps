import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Badge, EmptyState } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { voiceNoteService } from '@/services/voice-note.service';
import type { VoiceNote } from '@/schemas/voice-note.schema';
import { formatRelativeDate } from '@/utils/date';

export default function VoiceNoteScreen(): React.JSX.Element {
  const [notes, setNotes] = useState<VoiceNote[]>([]);

  useEffect(() => {
    voiceNoteService.getAll().then(setNotes);
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title="Notes vocales CRM" showBack />
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.clientRow}>
                <Ionicons name="mic" size={18} color={COLORS.accent} />
                <Text variant="body" style={styles.clientName}>{item.clientName}</Text>
              </View>
              <Text variant="caption" color={COLORS.textMuted}>
                {formatDuration(item.duration)}
              </Text>
            </View>
            {item.transcription && (
              <Text variant="caption" color={COLORS.textSecondary} numberOfLines={3}>
                {item.transcription}
              </Text>
            )}
            <View style={styles.tagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text variant="caption" color={COLORS.primary} style={styles.tagText}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
            <Text variant="caption" color={COLORS.textMuted}>
              {formatRelativeDate(item.createdAt)}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="mic-outline" title="Aucune note vocale" />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.sm,
  },
  card: {
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  clientName: {
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
