import React, { useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, View, FlatList, StyleSheet } from 'react-native';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Badge, Button, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { voiceNoteService, isVoiceNoteConflict, voiceNoteSyncMessage, canResyncVoiceNoteFromHistory, isVoiceNoteUpdateUnavailable } from '@/services/voice-note.service';
import type { VoiceNote } from '@/schemas/voice-note.schema';
import { useFeatures } from '@/hooks/useFeatures';
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
  const { crmHistoryEditingEnabled, refreshFeatures } = useFeatures();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const retryingRef = useRef(false);
  const readRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadNotes = useCallback(async () => {
    if (retryingRef.current) return;
    const request = ++readRequest.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await voiceNoteService.getAll();
      if (request === readRequest.current) setNotes(result);
    } catch {
      if (request === readRequest.current) setLoadError(true);
    } finally {
      if (request === readRequest.current) setLoading(false);
    }
  }, []);

  // Reload notes when screen is focused (after recording)
  useFocusEffect(
    useCallback(() => {
      void loadNotes();
      return () => { readRequest.current += 1; };
    }, [loadNotes]),
  );

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleResync = async (item: VoiceNote): Promise<void> => {
    if (retryingRef.current || !canResyncVoiceNoteFromHistory(item, crmHistoryEditingEnabled)) return;
    retryingRef.current = true;
    readRequest.current += 1;
    setLoading(false);
    setRetryingId(item.id);
    try {
      if (!canResyncVoiceNoteFromHistory(item)) {
        const latest = await refreshFeatures();
        if (!canResyncVoiceNoteFromHistory(item, latest.crmHistoryEditingEnabled)) return;
      }
      const updated = await voiceNoteService.resync(item.id, item.revision);
      setNotes((current) => current.map((note) => (note.id === item.id ? updated : note)));
      if (updated.syncStatus === 'synced') haptic.success();
      else {
        haptic.warning();
        Alert.alert(t('voiceNote.savedSyncFailedTitle'), t(voiceNoteSyncMessage(updated)));
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 403
        && !(await refreshFeatures()).crmHistoryEditingEnabled) return;
      haptic.error();
      logger.error('Voice note resync failed', error);
      Alert.alert(t('voiceNote.resyncErrorTitle'), t(isVoiceNoteConflict(error) ? 'voiceNote.historyConflictBody' : 'voiceNote.resyncErrorBody'));
    } finally {
      retryingRef.current = false;
      setRetryingId(null);
    }
  };

  const handleEdit = async (item: VoiceNote): Promise<void> => {
    if (retryingRef.current || !crmHistoryEditingEnabled) return;
    const latest = await refreshFeatures();
    if (!retryingRef.current && latest.crmHistoryEditingEnabled) {
      router.push({ pathname: '/voice-note/record', params: { noteId: item.id } });
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
        refreshing={loading && notes.length > 0}
        onRefresh={() => { void loadNotes(); void refreshFeatures(); }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={loadError ? <View style={styles.readState}>
          <Text variant="body">{t('voiceNote.loadErrorTitle')}</Text>
          <Text variant="caption" color={COLORS.textSecondary}>{t('voiceNote.loadErrorBody')}</Text>
          <Button title={t('common.retry')} variant="secondary" onPress={() => void loadNotes()} />
        </View> : null}
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
              </View>
              {(item.syncErrorCode || item.syncStatus === 'deleted') && (
                <Text variant="caption" color={COLORS.textSecondary}>{t(voiceNoteSyncMessage(item))}</Text>
              )}
              {isVoiceNoteUpdateUnavailable(item) && item.syncStatus === 'pending' && (
                <Text variant="caption" color={COLORS.textSecondary}>{t('voiceNote.updateUnavailableBody')}</Text>
              )}
              {(crmHistoryEditingEnabled || canResyncVoiceNoteFromHistory(item, crmHistoryEditingEnabled)) && <View style={styles.actions}>
                {crmHistoryEditingEnabled && <Button title={t('voiceNote.editNote')} variant="secondary" size="sm" disabled={retryingId !== null}
                  onPress={() => void handleEdit(item)} />}
                {canResyncVoiceNoteFromHistory(item, crmHistoryEditingEnabled) && (
                  <Button
                    title={t('voiceNote.resync')}
                    variant="secondary"
                    size="sm"
                    loading={retryingId === item.id}
                    disabled={retryingId !== null && retryingId !== item.id}
                    onPress={() => void handleResync(item)}
                  />
                )}
              </View>}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={COLORS.primary} style={styles.readState} /> : loadError ? null :
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  clientName: {
    flexShrink: 1,
    fontWeight: '700',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  readState: { paddingVertical: SPACING.lg, gap: SPACING.sm },
});
