import React, { useEffect, useState, useCallback } from 'react';
import { Alert, View, FlatList, StyleSheet } from 'react-native';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Badge, Button, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { voiceNoteService } from '@/services/voice-note.service';
import type { VoiceNote } from '@/schemas/voice-note.schema';
import { formatRelativeDate } from '@/utils/date';
import { haptic } from '@/lib/haptics';
import { logger } from '@/lib/logger';

type SyncBadgeVariant = 'success' | 'danger' | 'pending' | 'neutral';

function syncBadgeVariant(status?: string): SyncBadgeVariant {
  if (status === 'synced') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'pending';
  return 'neutral';
}

export default function VoiceNoteScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Reload notes when screen is focused (after recording)
  useFocusEffect(
    useCallback(() => {
      voiceNoteService.getAll().then(setNotes);
    }, []),
  );

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleResync = async (id: string): Promise<void> => {
    setRetryingId(id);
    try {
      const updated = await voiceNoteService.resync(id);
      setNotes((current) => current.map((note) => (note.id === id ? updated : note)));
      haptic.success();
    } catch (error) {
      haptic.error();
      logger.error('Voice note resync failed', error);
      Alert.alert(t('voiceNote.resyncErrorTitle'), t('voiceNote.resyncErrorBody'));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title={t('voiceNote.title')} showBack />
      <View style={styles.recordButtonContainer}>
        <Button
          title={t('voiceNote.newNote')}
          variant="primary"
          icon={<Microphone2 size={20} color={COLORS.surface} />}
          onPress={() => router.push('/voice-note/record')}
          style={styles.recordButton}
        />
      </View>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.noteContent}>
              <View style={styles.topRow}>
                <View style={styles.clientRow}>
                  <Microphone2 size={18} color={COLORS.accent} />
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
              <Text variant="caption" color={COLORS.textMuted}>
                {formatRelativeDate(item.createdAt)}
              </Text>
              <View style={styles.syncRow}>
                <Badge
                  label={t(`voiceNote.syncStatus.${item.syncStatus ?? 'pending'}`)}
                  variant={syncBadgeVariant(item.syncStatus)}
                />
                {item.syncStatus === 'failed' && (
                  <Button
                    title={t('voiceNote.resync')}
                    variant="secondary"
                    size="sm"
                    loading={retryingId === item.id}
                    disabled={retryingId !== null && retryingId !== item.id}
                    onPress={() => void handleResync(item.id)}
                  />
                )}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon={<Microphone2 size={32} color={COLORS.textMuted} />} title={t('voiceNote.emptyState')} />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  recordButtonContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  recordButton: {
    width: '100%',
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.sm,
  },
  noteContent: {
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
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
});
