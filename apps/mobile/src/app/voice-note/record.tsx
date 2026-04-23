import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { StopCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Document } from 'react-native-solar-icons/icons/bold-duotone';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { voiceNoteService } from '@/services/voice-note.service';

// Mock CRM extraction from transcription
function extractCrmFields(transcription: string): CrmFields {
  const clientMatch = transcription.match(/(?:chez|avec|de)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/);
  const productMatch = transcription.match(/(?:utilise|huile|graisse|produit)\s+(?:du\s+|de la\s+)?([A-Za-zÀ-ü0-9\s]+?)(?:\.|,|$)/);
  const actionMatch = transcription.match(/(?:rappeler|confirmer|envoyer|recontacter|planifier)[^.]*\./i);

  const tags: string[] = [];
  if (/prospect|intéressé|potentiel/i.test(transcription)) tags.push('prospect-chaud');
  if (/devis|prix|tarif/i.test(transcription)) tags.push('devis');
  if (/hydraulique/i.test(transcription)) tags.push('hydraulique');
  if (/graisse/i.test(transcription)) tags.push('graisses');
  if (/contrat|renouvellement/i.test(transcription)) tags.push('contrat');
  if (/urgence|urgent/i.test(transcription)) tags.push('urgent');
  if (/salon|événement/i.test(transcription)) tags.push('salon');
  if (/livraison|logistique/i.test(transcription)) tags.push('logistique');

  return {
    clientName: clientMatch?.[1]?.trim() ?? '',
    contactName: '',
    product: productMatch?.[1]?.trim() ?? '',
    nextAction: actionMatch?.[0]?.trim() ?? '',
    tags,
  };
}

interface CrmFields {
  clientName: string;
  contactName: string;
  product: string;
  nextAction: string;
  tags: string[];
}

// Mock transcriptions for demo
const MOCK_TRANSCRIPTIONS = [
  "Visite chez Renault Trucks Lyon. Le chef d'atelier, M. Dupont, est intéressé par notre huile hydraulique Molyduval Hydran 46. Il utilise actuellement du Shell Tellus. Volume estimé 500L par mois. Rappeler mardi pour le devis.",
  "Appel avec Marie Lambert de PSA Poissy. Demande de prix urgente pour graisse EP lithium, 50 cartouches. Confirmer disponibilité sous 24h.",
  "Rencontre prospect Safran Paris. Besoin en huile compresseur, actuellement sous contrat Total. Renouvellement dans 3 mois. Envoyer catalogue et échantillon.",
];

export default function VoiceNoteRecordScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing' | 'review'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [crmFields, setCrmFields] = useState<CrmFields>({
    clientName: '',
    contactName: '',
    product: '',
    nextAction: '',
    tags: [],
  });
  const [saving, setSaving] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;

      recorder.record();
      setIsRecording(true);
      setPhase('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.log('[VoiceNote] Recording start failed:', error);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setPhase('transcribing');

    try {
      await recorder.stop();
    } catch {
      // Ignore errors on stop
    }

    // Simulate transcription (2s delay + random mock)
    setTimeout(() => {
      const mockText = MOCK_TRANSCRIPTIONS[Math.floor(Math.random() * MOCK_TRANSCRIPTIONS.length)];
      setTranscription(mockText);
      const fields = extractCrmFields(mockText);
      setCrmFields(fields);
      setPhase('review');
    }, 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('duration', String(duration));
      formData.append('transcription', transcription);
      formData.append('clientName', crmFields.clientName || t('voiceNote.unknownClient'));
      crmFields.tags.forEach((tag) => formData.append('tags', tag));
      if (recorder.uri) {
        formData.append('audio', { uri: recorder.uri, type: 'audio/m4a', name: 'recording.m4a' } as any);
      }
      await voiceNoteService.create(formData);
    } catch (e) {
      if (__DEV__) console.error('[VoiceNote] Save failed:', e);
    }
    setSaving(false);
    router.back();
  };

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title={t('voiceNote.newNoteTitle')} showBack />

      <View style={styles.content}>
        {/* Recording phase */}
        {(phase === 'idle' || phase === 'recording') && (
          <View style={styles.recordingSection}>
            <View style={styles.timerContainer}>
              <Text variant="heading" style={styles.timer}>
                {formatDuration(duration)}
              </Text>
              {isRecording && (
                <View style={styles.recordingDot} />
              )}
            </View>

            <Text variant="body" color={COLORS.textSecondary} style={styles.hint}>
              {isRecording
                ? t('voiceNote.recordingHint')
                : t('voiceNote.idleHint')}
            </Text>

            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.7}
            >
              {isRecording ? (
                <StopCircle size={40} color={COLORS.surface} />
              ) : (
                <Microphone2 size={40} color={COLORS.surface} />
              )}
            </TouchableOpacity>

            {isRecording && (
              <View style={styles.waveform}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: 8 + Math.random() * 24 },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Transcribing phase */}
        {phase === 'transcribing' && (
          <View style={styles.transcribingSection}>
            <View style={styles.transcribingIcon}>
              <Document size={40} color={COLORS.primary} />
            </View>
            <Text variant="body" color={COLORS.textSecondary}>
              {t('voiceNote.transcribing')}
            </Text>
            <Text variant="caption" color={COLORS.textMuted}>
              {t('voiceNote.aiAnalysis', { duration: formatDuration(duration) })}
            </Text>
          </View>
        )}

        {/* Review phase — transcription + CRM fields */}
        {phase === 'review' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Transcription */}
            <Card style={styles.reviewCard}>
              <Text variant="label">{t('voiceNote.transcription')}</Text>
              <TextInput
                style={styles.transcriptionInput}
                value={transcription}
                onChangeText={setTranscription}
                multiline
                textAlignVertical="top"
              />
            </Card>

            {/* CRM Fields */}
            <Card style={styles.reviewCard}>
              <Text variant="label">{t('voiceNote.crmFields')}</Text>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.client')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={crmFields.clientName}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, clientName: v }))}
                  placeholder={t('voiceNote.clientPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.contact')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={crmFields.contactName}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, contactName: v }))}
                  placeholder={t('voiceNote.contactPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.productField')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={crmFields.product}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, product: v }))}
                  placeholder={t('voiceNote.productPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.nextAction')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={crmFields.nextAction}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, nextAction: v }))}
                  placeholder={t('voiceNote.nextActionPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </Card>

            {/* Tags */}
            <Card style={styles.reviewCard}>
              <Text variant="label">{t('voiceNote.detectedTags')}</Text>
              <View style={styles.tagsRow}>
                {crmFields.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text variant="caption" color={COLORS.primary} style={styles.tagText}>
                      #{tag}
                    </Text>
                  </View>
                ))}
                {crmFields.tags.length === 0 && (
                  <Text variant="caption" color={COLORS.textMuted}>{t('voiceNote.noTags')}</Text>
                )}
              </View>
            </Card>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title={t('voiceNote.saveNote')}
                variant="primary"
                icon={<Document size={20} color={COLORS.surface} />}
                loading={saving}
                onPress={handleSave}
                style={styles.actionButton}
              />
              <Button
                title={t('voiceNote.reRecord')}
                variant="secondary"
                icon={<Microphone2 size={20} color={COLORS.primary} />}
                onPress={() => {
                  setPhase('idle');
                  setDuration(0);
                  setTranscription('');
                }}
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  recordingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timer: {
    fontSize: 48,
    fontWeight: '200',
    color: COLORS.text,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.danger,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
  },
  waveBar: {
    width: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  transcribingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xxl,
  },
  transcribingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  transcriptionInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  fieldRow: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 14,
    color: COLORS.text,
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
  actions: {
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  actionButton: {
    width: '100%',
  },
});
