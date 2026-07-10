import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { StopCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Document } from 'react-native-solar-icons/icons/bold-duotone';
import { Shop2 } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Card, BottomSheet, SearchBar } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { voiceNoteService } from '@/services/voice-note.service';
import { crmService, type CrmCompany, type CrmContact } from '@/services/crm.service';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { logger } from '@/lib/logger';

/**
 * Transcrit un enregistrement via POST /chat/transcribe (Whisper).
 * XHR direct : en React Native, axios/fetch échouent sur l'upload de fichier
 * par URI (voir useVoiceInput). Renvoie le texte transcrit (vide si échec).
 */
async function transcribeAudio(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', { uri, type: 'audio/m4a', name: 'note.m4a' } as unknown as Blob);
  const token = await storage.getToken();
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_CONFIG.baseURL}/chat/transcribe`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 30000;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const envelope = JSON.parse(xhr.responseText) as { data: { transcription: string } };
          resolve((envelope.data?.transcription ?? '').trim());
        } catch {
          reject(new Error('Failed to parse transcription response'));
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Transcription timed out'));
    xhr.send(formData);
  });
}

interface CrmFields {
  clientName: string;
  contactName: string;
  product: string;
  nextAction: string;
  notes: string;
}

type CrmAttachmentMode = 'company' | 'contact';

function roundToNextSlot(date = new Date()): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const nextMinutes = minutes <= 30 ? 30 : 60;
  if (nextMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(nextMinutes, 0, 0);
  }
  return rounded;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function applyDatePart(current: Date, selectedDate: Date): Date {
  const next = new Date(current);
  next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function buildCalendarDays(month: Date): { date: Date; inMonth: boolean }[] {
  const first = startOfMonth(month);
  const firstWeekday = (first.getDay() + 6) % 7; // Monday-first calendar.
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, inMonth: sameMonth(date, first) };
  });
}

function formatTimeInput(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function applyTimeInput(current: Date, value: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const next = new Date(current);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addMinutes(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + delta);
  next.setSeconds(0, 0);
  return next;
}

export default function VoiceNoteRecordScreen(): React.JSX.Element {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing' | 'review'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [crmFields, setCrmFields] = useState<CrmFields>({
    clientName: '',
    contactName: '',
    product: '',
    nextAction: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<CrmAttachmentMode>('company');
  const [meetingAt, setMeetingAt] = useState<Date>(() => roundToNextSlot());
  const [meetingMonth, setMeetingMonth] = useState<Date>(() => startOfMonth(roundToNextSlot()));
  const [meetingTimeText, setMeetingTimeText] = useState(() => formatTimeInput(roundToNextSlot()));
  const [meetingSheetVisible, setMeetingSheetVisible] = useState(false);
  // Sélecteur société CRM (alimente comm_companyid côté API).
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySheetVisible, setCompanySheetVisible] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMissingCrmCredentialsError = (error: any): boolean =>
    error?.response?.status === 400 &&
    /CRM credentials not configured/i.test(String(error?.response?.data?.message ?? ''));

  const showMissingCrmCredentialsAlert = () => {
    haptic.warning();
    Alert.alert(
      t('voiceNote.crmCredentialsRequiredTitle'),
      t('voiceNote.crmCredentialsRequiredBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('voiceNote.openCrmConnection'),
          onPress: () => router.push('/crm-credentials'),
        },
      ],
    );
  };

  // Recherche société côté serveur (≤50 résultats parmi ~17k).
  const loadCompanies = useCallback(async (q: string) => {
    setLoadingCompanies(true);
    try {
      const res = await crmService.searchCompanies(q);
      setCompanies(res.items);
      setTotalCompanies(res.total);
      setCompaniesLoaded(true);
    } catch (e: any) {
      if (isMissingCrmCredentialsError(e)) {
        setCompanySheetVisible(false);
        showMissingCrmCredentialsAlert();
      } else {
        logger.error('CRM companies load failed', e);
      }
      setCompanies([]);
      setTotalCompanies(0);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const openCompanySheet = () => {
    haptic.light();
    setCompanyQuery('');
    setCompanySheetVisible(true);
  };

  const loadContacts = useCallback(async (selectedCompanyId: string | null, q: string) => {
    setLoadingContacts(true);
    try {
      const res = await crmService.searchContacts(selectedCompanyId, q);
      setContacts(res.items);
      setTotalContacts(res.total);
      setContactsLoaded(true);
    } catch (e: any) {
      if (isMissingCrmCredentialsError(e)) {
        setContactSheetVisible(false);
        showMissingCrmCredentialsAlert();
      } else {
        logger.error('CRM contacts load failed', {
          status: e?.response?.status,
          data: e?.response?.data,
          message: e?.message,
        });
      }
      setContacts([]);
      setTotalContacts(0);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const openContactSheet = () => {
    if (attachmentMode === 'company' && !companyId) {
      haptic.warning();
      return;
    }

    haptic.light();
    setContactQuery('');
    setContactSheetVisible(true);
  };

  // Debounce : recharge la recherche quand la requête change (sheet ouverte).
  useEffect(() => {
    if (!companySheetVisible) return;
    const id = setTimeout(() => loadCompanies(companyQuery), 300);
    return () => clearTimeout(id);
  }, [companyQuery, companySheetVisible, loadCompanies]);

  useEffect(() => {
    if (!contactSheetVisible) return;
    const selectedCompanyId = attachmentMode === 'company' ? companyId : null;
    if (attachmentMode === 'company' && !selectedCompanyId) return;
    const id = setTimeout(() => loadContacts(selectedCompanyId, contactQuery), 300);
    return () => clearTimeout(id);
  }, [attachmentMode, companyId, contactQuery, contactSheetVisible, loadContacts]);

  const switchAttachmentMode = (mode: CrmAttachmentMode) => {
    if (mode === attachmentMode) return;

    haptic.light();
    setAttachmentMode(mode);
    setCompanyId(null);
    setCompanyName('');
    setContactId(null);
    setContacts([]);
    setTotalContacts(0);
    setContactsLoaded(false);
    setCrmFields((f) => ({ ...f, clientName: '', contactName: '' }));
  };

  const selectCompany = (company: CrmCompany) => {
    haptic.light();
    setCompanyId(company.id);
    setCompanyName(company.name);
    setContactId(null);
    setContacts([]);
    setTotalContacts(0);
    setContactsLoaded(false);
    setCrmFields((f) => ({ ...f, clientName: company.name, contactName: '' }));
    setCompanySheetVisible(false);
  };

  const selectContact = (contact: CrmContact) => {
    haptic.light();
    setContactId(contact.id);
    if (contact.companyId) {
      setCompanyId(contact.companyId);
      setCompanyName(contact.companyName ?? '');
    }
    setCrmFields((f) => ({
      ...f,
      contactName: contact.name,
      clientName: contact.companyName || f.clientName,
    }));
    setContactSheetVisible(false);
  };

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

  const formatMeetingDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });

  const formatMeetingDateTime = (date: Date) =>
    `${formatMeetingDate(date)} · ${date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  const formatMeetingMonth = (date: Date) =>
    date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const formatCalendarDay = (date: Date) =>
    date.toLocaleDateString(locale, { day: '2-digit' });

  const formatWeekday = (index: number) => {
    const baseMonday = new Date(2024, 0, 1 + index);
    return baseMonday.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
  };

  const openMeetingSheet = () => {
    haptic.light();
    setMeetingMonth(startOfMonth(meetingAt));
    setMeetingTimeText(formatTimeInput(meetingAt));
    setMeetingSheetVisible(true);
  };

  const selectMeetingDate = (date: Date) => {
    haptic.light();
    setMeetingAt((current) => applyDatePart(current, date));
    if (!sameMonth(date, meetingMonth)) {
      setMeetingMonth(startOfMonth(date));
    }
  };

  const commitMeetingTime = () => {
    const next = applyTimeInput(meetingAt, meetingTimeText);
    if (!next) {
      haptic.warning();
      setMeetingTimeText(formatTimeInput(meetingAt));
      return;
    }

    setMeetingAt(next);
    setMeetingTimeText(formatTimeInput(next));
  };

  const adjustMeetingTime = (minutes: number) => {
    haptic.light();
    setMeetingAt((current) => {
      const next = addMinutes(current, minutes);
      setMeetingTimeText(formatTimeInput(next));
      return next;
    });
  };

  const canSave = Boolean(companyId);

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        haptic.warning();
        return;
      }

      // iOS refuse l'enregistrement tant que le mode audio ne l'autorise pas
      // explicitement (playsInSilentMode requis pour capter en mode silencieux).
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      // Indispensable : initialise le fichier de sortie, sinon recorder.uri
      // pointe vers un fichier inexistant après stop (erreur "no such file").
      await recorder.prepareToRecordAsync();

      haptic.medium();
      recorder.record();
      setIsRecording(true);
      setPhase('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      haptic.error();
      logger.error('VoiceNote recording start failed', error);
    }
  };

  const stopRecording = async () => {
    haptic.medium();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setPhase('transcribing');

    let uri: string | null = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      uri = recorder.uri ?? null;
    } catch (error) {
      logger.error('VoiceNote stop failed', error);
    }

    // Transcription Whisper via /chat/transcribe avant l'écran de review.
    // On garde le résultat modifiable ; en cas d'échec, saisie manuelle.
    let text = '';
    if (uri && duration >= 1) {
      try {
        text = await transcribeAudio(uri);
      } catch (error) {
        logger.error('VoiceNote transcription failed', error);
      }
    }

    setTranscription(text);
    const nextMeetingAt = roundToNextSlot();
    setMeetingAt(nextMeetingAt);
    setMeetingMonth(startOfMonth(nextMeetingAt));
    setMeetingTimeText(formatTimeInput(nextMeetingAt));
    setPhase('review');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('duration', String(duration));
      formData.append('transcription', transcription);
      formData.append('clientName', crmFields.clientName || t('voiceNote.unknownClient'));
      formData.append('contactName', crmFields.contactName);
      if (contactId) formData.append('contactId', contactId);
      formData.append('meetingAt', meetingAt.toISOString());
      formData.append('productMentioned', crmFields.product);
      formData.append('nextAction', crmFields.nextAction);
      formData.append('notes', crmFields.notes);
      if (companyId) formData.append('companyId', companyId);
      if (recorder.uri) {
        formData.append('audio', {
          uri: recorder.uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as unknown as Blob);
      }
      await voiceNoteService.create(formData);
      haptic.success();
      router.back();
    } catch (e) {
      haptic.error();
      Alert.alert(t('voiceNote.saveErrorTitle'), t('voiceNote.saveErrorBody'));
      if (__DEV__) console.error('[VoiceNote] Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title={t('voiceNote.newNoteTitle')} showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
              accessibilityRole="button"
              accessibilityLabel={
                isRecording
                  ? t('voiceNote.stopRecording', { defaultValue: 'Stop recording' })
                  : t('voiceNote.startRecording', { defaultValue: 'Start recording' })
              }
              accessibilityState={{ selected: isRecording }}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Transcription */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.transcription')}</Text>
                <TextInput
                  style={styles.transcriptionInput}
                  value={transcription}
                  onChangeText={setTranscription}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel={t('voiceNote.transcription')}
                />
              </View>
            </Card>

            {/* CRM attachment */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.crmAttachment')}</Text>

                <View style={styles.segmented}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      attachmentMode === 'company' && styles.segmentButtonActive,
                    ]}
                    onPress={() => switchAttachmentMode('company')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: attachmentMode === 'company' }}
                  >
                    <Text
                      variant="caption"
                      style={styles.segmentText}
                      color={attachmentMode === 'company' ? COLORS.primary : COLORS.textSecondary}
                    >
                      {t('voiceNote.attachCompany')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      attachmentMode === 'contact' && styles.segmentButtonActive,
                    ]}
                    onPress={() => switchAttachmentMode('contact')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: attachmentMode === 'contact' }}
                  >
                    <Text
                      variant="caption"
                      style={styles.segmentText}
                      color={attachmentMode === 'contact' ? COLORS.primary : COLORS.textSecondary}
                    >
                      {t('voiceNote.attachContact')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {attachmentMode === 'company' ? (
                  <TouchableOpacity
                    style={styles.companyPicker}
                    onPress={openCompanySheet}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('voiceNote.company')}
                  >
                    <View style={styles.companyPickerLeft}>
                      <Shop2 size={18} color={companyId ? COLORS.primary : COLORS.textMuted} />
                      <Text
                        variant="body"
                        color={companyId ? COLORS.text : COLORS.textMuted}
                        numberOfLines={1}
                      >
                        {companyName || t('voiceNote.companyPlaceholder')}
                      </Text>
                    </View>
                    <AltArrowRight size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.companyPicker}
                    onPress={openContactSheet}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('voiceNote.contact')}
                  >
                    <View style={styles.companyPickerLeft}>
                      <Shop2 size={18} color={contactId ? COLORS.primary : COLORS.textMuted} />
                      <Text
                        variant="body"
                        color={contactId ? COLORS.text : COLORS.textMuted}
                        numberOfLines={1}
                      >
                        {crmFields.contactName || t('voiceNote.contactPlaceholder')}
                      </Text>
                    </View>
                    <AltArrowRight size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}

                {attachmentMode === 'contact' && companyName ? (
                  <Text variant="caption" color={COLORS.textMuted}>
                    {t('voiceNote.contactCompany', { company: companyName })}
                  </Text>
                ) : null}

                {!companyId && (
                  <Text variant="caption" color={COLORS.textMuted}>
                    {attachmentMode === 'company'
                      ? t('voiceNote.companyHint')
                      : t('voiceNote.contactGlobalHint')}
                  </Text>
                )}
              </View>
            </Card>

            {/* Appointment */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.meetingAt')}</Text>
                <TouchableOpacity
                  style={styles.companyPicker}
                  onPress={openMeetingSheet}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('voiceNote.meetingAt')}
                >
                  <View style={styles.companyPickerLeft}>
                    <Document size={18} color={COLORS.primary} />
                    <Text variant="body" color={COLORS.text} numberOfLines={1}>
                      {formatMeetingDateTime(meetingAt)}
                    </Text>
                  </View>
                  <AltArrowRight size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
                <Text variant="caption" color={COLORS.textMuted}>
                  {t('voiceNote.meetingAtHint')}
                </Text>
              </View>
            </Card>

            {/* CRM Fields */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.crmFields')}</Text>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.client')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={crmFields.clientName}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, clientName: v }))}
                  placeholder={t('voiceNote.clientPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="words"
                  autoComplete="organization"
                  textContentType="organizationName"
                  returnKeyType="next"
                  accessibilityLabel={t('voiceNote.client')}
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
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  accessibilityLabel={t('voiceNote.productField')}
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
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  accessibilityLabel={t('voiceNote.nextAction')}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.notes')}</Text>
                <TextInput
                  style={[styles.fieldInput, styles.notesInput]}
                  value={crmFields.notes}
                  onChangeText={(v) => setCrmFields((f) => ({ ...f, notes: v }))}
                  placeholder={t('voiceNote.notesPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="sentences"
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel={t('voiceNote.notes')}
                />
              </View>
              </View>
            </Card>

            {/* Actions */}
            <View style={styles.actions}>
              {!canSave && (
                <Text variant="caption" color={COLORS.textMuted} style={styles.saveHint}>
                  {t('voiceNote.attachmentRequired')}
                </Text>
              )}
              <Button
                title={t('voiceNote.saveNote')}
                variant="primary"
                icon={<Document size={20} color={COLORS.surface} />}
                loading={saving}
                disabled={!canSave}
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
                  setCompanyId(null);
                  setCompanyName('');
                  setContactId(null);
                  setContacts([]);
                  setTotalContacts(0);
                  setContactsLoaded(false);
                  setAttachmentMode('company');
                  const nextMeetingAt = roundToNextSlot();
                  setMeetingAt(nextMeetingAt);
                  setMeetingMonth(startOfMonth(nextMeetingAt));
                  setMeetingTimeText(formatTimeInput(nextMeetingAt));
                  setCrmFields({
                    clientName: '',
                    contactName: '',
                    product: '',
                    nextAction: '',
                    notes: '',
                  });
                }}
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        )}
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <BottomSheet visible={companySheetVisible} onClose={() => setCompanySheetVisible(false)}>
        <Text variant="label" style={styles.sheetTitle}>{t('voiceNote.selectCompany')}</Text>
        <SearchBar
          value={companyQuery}
          onChangeText={setCompanyQuery}
          placeholder={t('voiceNote.searchCompany')}
          style={styles.sheetSearch}
        />
        {loadingCompanies ? (
          <ActivityIndicator color={COLORS.primary} style={styles.sheetLoader} />
        ) : companies.length === 0 ? (
          <Text variant="caption" color={COLORS.textMuted} style={styles.sheetEmpty}>
            {companiesLoaded ? t('voiceNote.noCompany') : t('voiceNote.companyLoadError')}
          </Text>
        ) : (
          <>
            {companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                style={styles.companyRow}
                onPress={() => selectCompany(company)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={company.name}
              >
                <Shop2
                  size={18}
                  color={company.id === companyId ? COLORS.primary : COLORS.textMuted}
                />
                <Text variant="body" numberOfLines={1} style={styles.flex}>
                  {company.name}
                </Text>
              </TouchableOpacity>
            ))}
            {totalCompanies > companies.length && (
              <Text variant="caption" color={COLORS.textMuted} style={styles.sheetEmpty}>
                {t('voiceNote.companyTruncated', {
                  shown: companies.length,
                  total: totalCompanies,
                })}
              </Text>
            )}
          </>
        )}
      </BottomSheet>

      <BottomSheet visible={contactSheetVisible} onClose={() => setContactSheetVisible(false)}>
        <Text variant="label" style={styles.sheetTitle}>{t('voiceNote.selectContact')}</Text>
        <SearchBar
          value={contactQuery}
          onChangeText={setContactQuery}
          placeholder={t('voiceNote.searchContact')}
          style={styles.sheetSearch}
        />
        {loadingContacts ? (
          <ActivityIndicator color={COLORS.primary} style={styles.sheetLoader} />
        ) : contacts.length === 0 ? (
          <Text variant="caption" color={COLORS.textMuted} style={styles.sheetEmpty}>
            {contactsLoaded ? t('voiceNote.noContact') : t('voiceNote.contactLoadError')}
          </Text>
        ) : (
          <>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.companyRow}
                onPress={() => selectContact(contact)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={contact.name}
              >
                <Shop2
                  size={18}
                  color={contact.id === contactId ? COLORS.primary : COLORS.textMuted}
                />
                <View style={styles.contactRowText}>
                  <Text variant="body" numberOfLines={1} style={styles.flex}>
                    {contact.name}
                  </Text>
                  {contact.companyName ? (
                    <Text variant="caption" color={COLORS.textMuted} numberOfLines={1}>
                      {contact.companyName}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            {totalContacts > contacts.length && (
              <Text variant="caption" color={COLORS.textMuted} style={styles.sheetEmpty}>
                {t('voiceNote.contactTruncated', {
                  shown: contacts.length,
                  total: totalContacts,
                })}
              </Text>
            )}
          </>
        )}
      </BottomSheet>

      <BottomSheet visible={meetingSheetVisible} onClose={() => setMeetingSheetVisible(false)}>
        <Text variant="label" style={styles.sheetTitle}>{t('voiceNote.selectMeetingAt')}</Text>
        <Text variant="caption" color={COLORS.textMuted} style={styles.sheetIntro}>
          {formatMeetingDateTime(meetingAt)}
        </Text>

        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.calendarNavButton}
            onPress={() => setMeetingMonth((current) => addMonths(current, -1))}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('voiceNote.previousMonth')}
          >
            <AltArrowRight size={16} color={COLORS.textSecondary} style={styles.prevMonthIcon} />
          </TouchableOpacity>
          <Text variant="body" style={styles.calendarTitle}>
            {formatMeetingMonth(meetingMonth)}
          </Text>
          <TouchableOpacity
            style={styles.calendarNavButton}
            onPress={() => setMeetingMonth((current) => addMonths(current, 1))}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('voiceNote.nextMonth')}
          >
            <AltArrowRight size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Text key={index} variant="caption" color={COLORS.textMuted} style={styles.weekday}>
              {formatWeekday(index)}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {buildCalendarDays(meetingMonth).map(({ date, inMonth }) => {
            const selected = dateKey(date) === dateKey(meetingAt);
            return (
              <TouchableOpacity
                key={dateKey(date)}
                style={[
                  styles.calendarDay,
                  !inMonth && styles.calendarDayOutside,
                ]}
                onPress={() => selectMeetingDate(date)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={[styles.calendarDayBubble, selected && styles.calendarDayBubbleActive]}>
                  <Text
                    variant="caption"
                    style={styles.segmentText}
                    color={
                      selected
                        ? COLORS.primary
                        : inMonth
                          ? COLORS.text
                          : COLORS.textMuted
                    }
                  >
                    {formatCalendarDay(date)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text variant="caption" style={styles.sheetSectionTitle}>{t('voiceNote.meetingTime')}</Text>
        <View style={styles.timeEditor}>
          <TouchableOpacity
            style={styles.timeAdjustButton}
            onPress={() => adjustMeetingTime(-15)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('voiceNote.decreaseTime')}
          >
            <Text variant="body" color={COLORS.text}>-15</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.timeInput}
            value={meetingTimeText}
            onChangeText={setMeetingTimeText}
            onBlur={commitMeetingTime}
            onSubmitEditing={commitMeetingTime}
            keyboardType="numbers-and-punctuation"
            placeholder="HH:mm"
            placeholderTextColor={COLORS.textMuted}
            maxLength={5}
            returnKeyType="done"
            accessibilityLabel={t('voiceNote.meetingTime')}
          />
          <TouchableOpacity
            style={styles.timeAdjustButton}
            onPress={() => adjustMeetingTime(15)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('voiceNote.increaseTime')}
          >
            <Text variant="body" color={COLORS.text}>+15</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('common.ok')}
          variant="primary"
          onPress={() => setMeetingSheetVisible(false)}
          style={styles.sheetButton}
        />
      </BottomSheet>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    marginBottom: SPACING.md,
  },
  cardContent: {
    gap: SPACING.sm,
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
  companyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  disabledPicker: {
    opacity: 0.55,
  },
  companyPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  segmentText: {
    fontWeight: '700',
  },
  sheetTitle: {
    marginBottom: SPACING.md,
  },
  sheetSearch: {
    marginBottom: SPACING.md,
  },
  sheetIntro: {
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  sheetSectionTitle: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sheetLoader: {
    paddingVertical: SPACING.xl,
  },
  sheetEmpty: {
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactRowText: {
    flex: 1,
    gap: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  calendarNavButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevMonthIcon: {
    transform: [{ rotate: '180deg' }],
  },
  calendarTitle: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: SPACING.xs,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayOutside: {
    opacity: 0.38,
  },
  calendarDayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarDayBubbleActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '28',
  },
  timeEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeAdjustButton: {
    minWidth: 56,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInput: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetButton: {
    width: '100%',
    marginTop: SPACING.lg,
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
  notesInput: {
    minHeight: 76,
  },
  actions: {
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  saveHint: {
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
});
