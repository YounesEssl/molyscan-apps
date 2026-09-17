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
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Card, BottomSheet, SearchBar } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { voiceNoteService, isVoiceNoteConflict, voiceNoteSyncMessage, isVoiceNoteUpdateUnavailable, canSendVoiceNote } from '@/services/voice-note.service';
import type { VoiceNote } from '@/schemas/voice-note.schema';
import { voiceNoteToDraft, voiceNoteObjectives, voiceNoteDraftChanges, mergeVoiceNoteDraft, type VoiceNoteDraft } from '@/lib/voiceNoteDraft';
import { crmService, type CrmCompany, type CrmContact, type CrmCommunicationOptions, type CrmOption } from '@/services/crm.service';
import { transcribeAudio } from '@/services/transcription.service';
import { useRecordingKeepAwake } from '@/hooks/useRecordingKeepAwake';
import { haptic } from '@/lib/haptics';
import { logger } from '@/lib/logger';
import { useAiDataConsent } from '@/providers/AiDataConsentProvider';

interface CrmFields {
  clientName: string;
  contactName: string;
  product: string;
  nextAction: string;
  notes: string;
}

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
  const navigation = useNavigation();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const isEditing = Boolean(noteId);
  const { t, i18n } = useTranslation();
  const { requestConsent } = useAiDataConsent();
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing' | 'review'>(isEditing ? 'review' : 'idle');
  const [isRecording, setIsRecording] = useState(false);
  useRecordingKeepAwake(isRecording || phase === 'transcribing');
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const audioUriRef = useRef<string | null>(null);
  const [crmFields, setCrmFields] = useState<CrmFields>({
    clientName: '',
    contactName: '',
    product: '',
    nextAction: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const [saveIntent, setSaveIntent] = useState<'local' | 'send'>('local');
  const [loadedNote, setLoadedNote] = useState<VoiceNote | null>(null);
  const [baselineDraft, setBaselineDraft] = useState<VoiceNoteDraft | null>(null);
  const [loadingNote, setLoadingNote] = useState(isEditing);
  const [loadError, setLoadError] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [editNotice, setEditNotice] = useState<string | null>(null);
  const [meetingAtSet, setMeetingAtSet] = useState(true);
  const [meetingEndAtSet, setMeetingEndAtSet] = useState(true);
  const [meetingAt, setMeetingAt] = useState<Date>(() => roundToNextSlot());
  const [meetingEndAt, setMeetingEndAt] = useState<Date>(() => addMinutes(roundToNextSlot(), 30));
  const [meetingPickerTarget, setMeetingPickerTarget] = useState<'start' | 'end'>('start');
  const activeMeetingAt = meetingPickerTarget === 'end' ? meetingEndAt : meetingAt;
  const [crmOptions, setCrmOptions] = useState<CrmCommunicationOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionSheet, setOptionSheet] = useState<'action' | 'objective' | null>(null);
  const [crmAction, setCrmAction] = useState<CrmOption | null>(null);
  const [crmObjectives, setCrmObjectives] = useState<CrmOption[]>([]);
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

  const draft: VoiceNoteDraft = {
    transcription, clientName: crmFields.clientName, contactName: crmFields.contactName,
    contactId, companyId, meetingAt: meetingAtSet ? meetingAt.toISOString() : null,
    meetingEndAt: meetingEndAtSet ? meetingEndAt.toISOString() : null,
    crmActionCode: crmAction?.value ?? null, crmObjectiveCodes: crmObjectives.map((option) => option.value),
    productMentioned: crmFields.product, nextAction: crmFields.nextAction, notes: crmFields.notes,
  };
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const changes = baselineDraft ? voiceNoteDraftChanges(baselineDraft, draft) : {};
  const isDirty = isEditing && Object.keys(changes).length > 0;

  const applyDraft = useCallback((value: VoiceNoteDraft, note: VoiceNote) => {
    setTranscription(value.transcription);
    setDuration(note.duration);
    setCrmFields({ clientName: value.clientName, contactName: value.contactName,
      product: value.productMentioned, nextAction: value.nextAction, notes: value.notes });
    setCompanyId(value.companyId);
    // The saved client label is editable text, not a verified CRM company name.
    setCompanyName('');
    setContactId(value.contactId);
    const start = new Date(value.meetingAt ?? note.createdAt);
    setMeetingAt(start);
    setMeetingEndAt(new Date(value.meetingEndAt ?? start.getTime() + 30 * 60_000));
    setMeetingAtSet(value.meetingAt !== null);
    setMeetingEndAtSet(value.meetingEndAt !== null);
    setCrmAction(value.crmActionCode ? { value: value.crmActionCode,
      label: value.crmActionCode === note.crmActionCode ? note.crmActionLabel || value.crmActionCode : value.crmActionCode } : null);
    const knownObjectives = voiceNoteObjectives(note);
    setCrmObjectives(value.crmObjectiveCodes.map((code) => knownObjectives.find((option) => option.value === code)
      ?? { value: code, label: code }));
  }, []);

  const noteLoadRef = useRef(0);
  const loadNote = useCallback(async () => {
    if (!noteId) return;
    const request = ++noteLoadRef.current;
    setLoadingNote(true);
    setLoadError(false);
    try {
      const note = await voiceNoteService.getById(noteId);
      if (request !== noteLoadRef.current) return;
      const next = voiceNoteToDraft(note);
      setLoadedNote(note);
      setBaselineDraft(next);
      applyDraft(next, note);
    } catch {
      if (request === noteLoadRef.current) setLoadError(true);
    } finally {
      if (request === noteLoadRef.current) setLoadingNote(false);
    }
  }, [noteId, applyDraft]);

  useEffect(() => {
    void loadNote();
    return () => { noteLoadRef.current += 1; };
  }, [loadNote]);

  usePreventRemove(isEditing && (isDirty || saving), ({ data }) => {
    if (saveInFlightRef.current) {
      Alert.alert(t('voiceNote.operationInProgress'), t('voiceNote.waitForSave'));
      return;
    }
    Alert.alert(t('voiceNote.unsavedTitle'), t('voiceNote.unsavedBody'), [
      { text: t('voiceNote.keepEditing'), style: 'cancel' },
      { text: t('voiceNote.discardChanges'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const reloadPreservingEdits = async () => {
    if (!noteId || !baselineDraft || saveInFlightRef.current) return;
    setLoadingNote(true);
    try {
      const latest = await voiceNoteService.getById(noteId);
      const nextBase = voiceNoteToDraft(latest);
      const merged = mergeVoiceNoteDraft(baselineDraft, draftRef.current, nextBase);
      setLoadedNote(latest);
      setBaselineDraft(nextBase);
      applyDraft(merged.draft, latest);
      setNeedsReload(false);
      setEditNotice(merged.conflicts.length ? 'voiceNote.reloadedConflicts' : 'voiceNote.reloadedPreserved');
    } catch {
      Alert.alert(t('voiceNote.loadErrorTitle'), t('voiceNote.reloadErrorBody'));
    } finally {
      setLoadingNote(false);
    }
  };

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

  const loadCommunicationOptions = async () => {
    setLoadingOptions(true);
    try {
      setCrmOptions(await crmService.getCommunicationOptions());
    } catch (error) {
      setCrmOptions(null);
      if (isMissingCrmCredentialsError(error)) {
        setOptionSheet(null);
        showMissingCrmCredentialsAlert();
      } else {
        logger.error('CRM reference lists unavailable', error);
      }
    } finally {
      setLoadingOptions(false);
    }
  };

  const openOptionSheet = (kind: 'action' | 'objective') => {
    setOptionSheet(kind);
    void loadCommunicationOptions();
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
    const id = setTimeout(() => loadContacts(companyId, contactQuery), 300);
    return () => clearTimeout(id);
  }, [companyId, contactQuery, contactSheetVisible, loadContacts]);

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

  const updateMeetingDate = (next: Date) => {
    if (meetingPickerTarget === 'end') {
      setMeetingEndAtSet(true);
      setMeetingEndAt(next);
    } else {
      setMeetingAtSet(true);
      // Moving the start keeps the selected appointment duration.
      const length = Math.max(60_000, meetingEndAt.getTime() - meetingAt.getTime());
      setMeetingAt(next);
      setMeetingEndAt(new Date(next.getTime() + length));
    }
  };

  const openMeetingSheet = (target: 'start' | 'end') => {
    haptic.light();
    const date = target === 'end' ? meetingEndAt : meetingAt;
    setMeetingPickerTarget(target);
    setMeetingMonth(startOfMonth(date));
    setMeetingTimeText(formatTimeInput(date));
    setMeetingSheetVisible(true);
  };

  const selectMeetingDate = (date: Date) => {
    haptic.light();
    updateMeetingDate(applyDatePart(activeMeetingAt, date));
    if (!sameMonth(date, meetingMonth)) setMeetingMonth(startOfMonth(date));
  };

  const commitMeetingTime = () => {
    const next = applyTimeInput(activeMeetingAt, meetingTimeText);
    if (!next) {
      haptic.warning();
      setMeetingTimeText(formatTimeInput(activeMeetingAt));
      return false;
    }
    updateMeetingDate(next);
    setMeetingTimeText(formatTimeInput(next));
    return true;
  };

  const adjustMeetingTime = (minutes: number) => {
    haptic.light();
    const next = addMinutes(activeMeetingAt, minutes);
    updateMeetingDate(next);
    setMeetingTimeText(formatTimeInput(next));
  };

  const validMeetingEnd = !meetingEndAtSet || (meetingAtSet && meetingEndAt > meetingAt);
  const canSave = Boolean(companyId) && validMeetingEnd;
  const attachmentLocked = isEditing && Boolean(loadedNote?.crmCommunicationId);
  const updateUnavailable = Boolean(loadedNote && isVoiceNoteUpdateUnavailable(loadedNote));
  const canSaveEdits = Boolean(loadedNote) && Boolean(crmFields.clientName.trim()) && validMeetingEnd
    && loadedNote?.syncStatus !== 'syncing' && !needsReload && !loadingNote;
  const formBusy = saving || loadingNote;
  const objectiveOptions = [
    ...(crmOptions?.objectivesAvailable ? crmOptions.objectives : []),
    ...crmObjectives.filter((selected) => !crmOptions?.objectivesAvailable
      || !crmOptions.objectives.some((option) => option.value === selected.value)),
  ];
  const optionChoices = optionSheet === 'action' ? (crmOptions?.actionsAvailable ? crmOptions.actions : []) : objectiveOptions;

  const startRecording = async () => {
    try {
      if (!(await requestConsent())) return;

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
      setTranscriptionFailed(false);
      audioUriRef.current = null;
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
      audioUriRef.current = uri;
    } catch (error) {
      logger.error('VoiceNote stop failed', error);
      setTranscriptionFailed(true);
    }

    // Transcription Whisper via /chat/transcribe avant l'écran de review.
    // On garde le résultat modifiable ; en cas d'échec, saisie manuelle.
    let text = '';
    if (uri && duration >= 1) {
      try {
        text = await transcribeAudio(uri);
      } catch (error) {
        logger.error('VoiceNote transcription failed', error);
        setTranscriptionFailed(true);
      }
    }

    if (!text) setTranscriptionFailed(true);
    setTranscription(text);
    const nextMeetingAt = roundToNextSlot();
    setMeetingAt(nextMeetingAt);
    setMeetingEndAt(addMinutes(nextMeetingAt, 30));
    setMeetingMonth(startOfMonth(nextMeetingAt));
    setMeetingTimeText(formatTimeInput(nextMeetingAt));
    setPhase('review');
  };

  const retryTranscription = async () => {
    if (!audioUriRef.current) return;
    setPhase('transcribing');
    try {
      const text = await transcribeAudio(audioUriRef.current);
      setTranscriptionFailed(!text);
      if (text) setTranscription(text);
    } catch (error) {
      setTranscriptionFailed(true);
      logger.error('Voice note transcription retry failed', error);
    } finally {
      setPhase('review');
    }
  };

  const handleSave = async () => {
    if (!canSave || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('duration', String(duration));
      formData.append('transcription', transcription);
      formData.append('clientName', crmFields.clientName || t('voiceNote.unknownClient'));
      formData.append('contactName', crmFields.contactName);
      if (contactId) formData.append('contactId', contactId);
      formData.append('meetingAt', meetingAt.toISOString());
      formData.append('meetingEndAt', meetingEndAt.toISOString());
      if (crmAction) formData.append('crmActionCode', crmAction.value);
      formData.append('crmObjectiveCodes', JSON.stringify(crmObjectives.map((option) => option.value)));
      formData.append('productMentioned', crmFields.product);
      formData.append('nextAction', crmFields.nextAction);
      formData.append('notes', crmFields.notes);
      if (companyId) formData.append('companyId', companyId);
      if (audioUriRef.current) {
        formData.append('audio', {
          uri: audioUriRef.current,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as unknown as Blob);
      }
      const saved = await voiceNoteService.create(formData);
      if (saved.syncStatus !== 'synced') {
        haptic.warning();
        Alert.alert(t('voiceNote.savedSyncFailedTitle'), t(voiceNoteSyncMessage(saved)), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      } else {
        haptic.success();
        router.back();
      }
    } catch (e) {
      haptic.error();
      Alert.alert(t('voiceNote.saveErrorTitle'), t('voiceNote.saveErrorBody'));
      if (__DEV__) console.error('[VoiceNote] Save failed:', e);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const handleSaveEdits = async (send: boolean) => {
    if (!noteId || !loadedNote || !baselineDraft || !canSaveEdits || saveInFlightRef.current || (send && (!companyId || !canSendVoiceNote(loadedNote)))) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveIntent(send ? 'send' : 'local');
    Keyboard.dismiss();
    let locallySaved = false;
    try {
      const patch = voiceNoteDraftChanges(baselineDraft, draftRef.current);
      let saved = loadedNote;
      if (Object.keys(patch).length) {
        saved = await voiceNoteService.update(noteId, { ...patch, expectedRevision: loadedNote.revision });
        const savedDraft = voiceNoteToDraft(saved);
        setLoadedNote(saved);
        setBaselineDraft(savedDraft);
        applyDraft(savedDraft, saved);
      }
      locallySaved = true;
      setEditNotice('voiceNote.savedLocallyBody');
      if (send) {
        saved = await voiceNoteService.resync(noteId, saved.revision);
        setLoadedNote(saved);
        const syncedDraft = voiceNoteToDraft(saved);
        setBaselineDraft(syncedDraft);
        applyDraft(syncedDraft, saved);
        setEditNotice(voiceNoteSyncMessage(saved));
        if (saved.syncStatus === 'synced') {
          haptic.success();
          Alert.alert(t('voiceNote.sentTitle'), t('voiceNote.sentBody'));
        } else {
          haptic.warning();
          Alert.alert(t('voiceNote.savedSyncFailedTitle'), t(voiceNoteSyncMessage(saved)));
        }
      } else {
        haptic.success();
      }
    } catch (error) {
      haptic.warning();
      if (isVoiceNoteConflict(error)) {
        setNeedsReload(true);
        setEditNotice('voiceNote.conflictBody');
        Alert.alert(t('voiceNote.conflictTitle'), t('voiceNote.conflictBody'));
      } else if (locallySaved) {
        setEditNotice('voiceNote.resyncErrorBody');
        Alert.alert(t('voiceNote.savedSyncFailedTitle'), t('voiceNote.resyncErrorBody'));
      } else {
        Alert.alert(t('voiceNote.saveErrorTitle'), t('voiceNote.editSaveErrorBody'));
      }
      logger.error('Voice note edit failed', error);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title={t(isEditing ? 'voiceNote.editTitle' : 'voiceNote.newNoteTitle')} showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.content}>
        {isEditing && loadingNote && !loadedNote && <ActivityIndicator color={COLORS.primary} style={styles.sheetLoader} />}
        {isEditing && loadError && !loadedNote && (
          <View style={styles.cardContent}>
            <Text variant="body">{t('voiceNote.loadErrorTitle')}</Text>
            <Text variant="caption" color={COLORS.textSecondary}>{t('voiceNote.loadErrorBody')}</Text>
            <Button title={t('common.retry')} onPress={() => void loadNote()} />
          </View>
        )}
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
        {phase === 'review' && (!isEditing || loadedNote) && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isEditing && loadedNote && (
              <Card style={styles.reviewCard}>
                <View style={styles.cardContent}>
                  <Text variant="label">{t(`voiceNote.syncStatus.${loadedNote.syncStatus}`)}</Text>
                  <Text variant="caption" color={COLORS.textSecondary}>
                    {t(isDirty && (!editNotice || editNotice === 'voiceNote.savedLocallyBody' || editNotice === 'voiceNote.sentBody')
                      ? 'voiceNote.unsavedHint' : editNotice ?? voiceNoteSyncMessage(loadedNote))}
                  </Text>
                  {(needsReload || loadedNote.syncStatus === 'syncing') && (
                    <Button title={t('voiceNote.reloadPreservingEdits')} variant="secondary" loading={loadingNote}
                      disabled={saving} onPress={() => void reloadPreservingEdits()} />
                  )}
                </View>
              </Card>
            )}
            <View pointerEvents={formBusy ? 'none' : 'auto'}>
            {/* Transcription */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.transcription')}</Text>
                <TextInput
                  editable={!formBusy}
                  style={styles.transcriptionInput}
                  value={transcription}
                  onChangeText={setTranscription}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel={t('voiceNote.transcription')}
                />
              </View>
            </Card>

            {transcriptionFailed && (
              <View style={styles.cardContent}>
                <Text variant="caption" color={COLORS.textSecondary}>{t('voiceNote.transcriptionFailed')}</Text>
                {audioUriRef.current && <Button title={t('voiceNote.retryTranscription')} variant="secondary" onPress={() => void retryTranscription()} />}
              </View>
            )}

            {/* CRM attachment */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.crmAttachment')}</Text>

                <Text variant="caption" color={COLORS.textSecondary}>
                  {t('voiceNote.company')}
                </Text>
                <TouchableOpacity
                  style={styles.companyPicker}
                  onPress={openCompanySheet}
                  disabled={attachmentLocked}
                  accessibilityState={{ disabled: attachmentLocked }}
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
                      {companyName || (companyId ? t('voiceNote.linkedCompany', { id: companyId }) : t('voiceNote.companyPlaceholder'))}
                    </Text>
                  </View>
                  <AltArrowRight size={14} color={COLORS.textMuted} />
                </TouchableOpacity>

                <Text variant="caption" color={COLORS.textSecondary}>
                  {t('voiceNote.contact')}
                </Text>
                <TouchableOpacity
                  style={styles.companyPicker}
                  onPress={openContactSheet}
                  disabled={attachmentLocked}
                  accessibilityState={{ disabled: attachmentLocked }}
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

                {attachmentLocked && <Text variant="caption" color={COLORS.textMuted}>{t('voiceNote.attachmentLocked')}</Text>}
                {!attachmentLocked && contactId && (
                  <Button title={t('voiceNote.clearContact')} variant="secondary" size="sm" onPress={() => {
                    setContactId(null); setCrmFields((fields) => ({ ...fields, contactName: '' }));
                  }} />
                )}

                {!companyId && (
                  <Text variant="caption" color={COLORS.textMuted}>
                    {t('voiceNote.contactGlobalHint')}
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
                  onPress={() => openMeetingSheet('start')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('voiceNote.meetingAt')}
                >
                  <View style={styles.companyPickerLeft}>
                    <Document size={18} color={COLORS.primary} />
                    <Text variant="body" color={COLORS.text} numberOfLines={1}>
                      {meetingAtSet ? formatMeetingDateTime(meetingAt) : t('voiceNote.notProvided')}
                    </Text>
                  </View>
                  <AltArrowRight size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
                <Text variant="caption" color={COLORS.textMuted}>
                  {t('voiceNote.meetingAtHint')}
                </Text>
                <Text variant="label">{t('voiceNote.meetingEndAt')}</Text>
                <TouchableOpacity
                  style={styles.companyPicker}
                  onPress={() => openMeetingSheet('end')}
                  accessibilityRole="button"
                  accessibilityLabel={t('voiceNote.meetingEndAt')}
                >
                  <Text variant="body">{meetingEndAtSet ? formatMeetingDateTime(meetingEndAt) : t('voiceNote.notProvided')}</Text>
                  <AltArrowRight size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
                {!validMeetingEnd && <Text variant="caption" color={COLORS.danger}>{t(meetingAtSet ? 'voiceNote.invalidMeetingEnd' : 'voiceNote.meetingStartRequired')}</Text>}

              </View>
            </Card>

            {/* CRM Fields */}
            <Card style={styles.reviewCard}>
              <View style={styles.cardContent}>
                <Text variant="label">{t('voiceNote.crmFields')}</Text>
                {(['action', 'objective'] as const).map((kind) => {
                  const selectedLabel = kind === 'action' ? crmAction?.label : crmObjectives.map((option) => option.label).join(', ');
                  return (
                    <View key={kind} style={styles.fieldRow}>
                      <Text variant="caption" style={styles.fieldLabel}>{t(`voiceNote.crm${kind === 'action' ? 'Action' : 'Objective'}`)}</Text>
                      <TouchableOpacity
                        style={styles.companyPicker}
                        onPress={() => openOptionSheet(kind)}
                        accessibilityRole="button"
                        accessibilityLabel={t(`voiceNote.crm${kind === 'action' ? 'Action' : 'Objective'}`)}
                      >
                        <Text variant="body" color={selectedLabel ? COLORS.text : COLORS.textMuted} style={styles.flex}>
                          {selectedLabel || t('voiceNote.selectCrmOption')}
                        </Text>
                        <AltArrowRight size={14} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}


              <View style={styles.fieldRow}>
                <Text variant="caption" style={styles.fieldLabel}>{t('voiceNote.client')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  editable={!formBusy}
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
                  editable={!formBusy}
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
                  editable={!formBusy}
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
                  editable={!formBusy}
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
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {!companyId && (
                <Text variant="caption" color={COLORS.textMuted} style={styles.saveHint}>
                  {t(isEditing ? 'voiceNote.attachmentRequiredForSend' : 'voiceNote.attachmentRequired')}
                </Text>
              )}
              {updateUnavailable && <Text variant="caption" color={COLORS.textSecondary}>{t('voiceNote.updateUnavailableBody')}</Text>}
              {loadedNote && (loadedNote.syncErrorCode === 'legacy_uncertain' || loadedNote.syncStatus === 'deleted') && (
                <Text variant="caption" color={COLORS.textSecondary}>{t(voiceNoteSyncMessage(loadedNote))}</Text>
              )}
              {isEditing ? <>
                <Button title={t('voiceNote.saveChanges')} variant="secondary" loading={saving && saveIntent === 'local'}
                  disabled={!canSaveEdits || !isDirty || saving} onPress={() => void handleSaveEdits(false)} style={styles.actionButton} />
                <Button title={t('voiceNote.saveAndSend')} variant="primary" loading={saving && saveIntent === 'send'}
                  disabled={!canSaveEdits || !companyId || saving || !loadedNote || !canSendVoiceNote(loadedNote)}
                  onPress={() => void handleSaveEdits(true)} style={styles.actionButton} />
              </> : <>
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
                disabled={saving}
                icon={<Microphone2 size={20} color={COLORS.primary} />}
                onPress={() => {
                  setPhase('idle');
                  setDuration(0);
                  setTranscription('');
                  setTranscriptionFailed(false);
                  audioUriRef.current = null;
                  setCrmAction(null);
                  setCrmObjectives([]);
                  setCompanyId(null);
                  setCompanyName('');
                  setContactId(null);
                  setContacts([]);
                  setTotalContacts(0);
                  setContactsLoaded(false);
                  const nextMeetingAt = roundToNextSlot();
                  setMeetingAt(nextMeetingAt);
                  setMeetingEndAt(addMinutes(nextMeetingAt, 30));
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
              </>}
            </View>
          </ScrollView>
        )}
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <BottomSheet visible={optionSheet !== null} onClose={() => setOptionSheet(null)}>
        <Text variant="label" style={styles.sheetTitle}>
          {t(optionSheet === 'action' ? 'voiceNote.crmAction' : 'voiceNote.crmObjective')}
        </Text>
        {optionSheet === 'objective' && <Text variant="caption" color={COLORS.textSecondary} style={styles.sheetIntro}>
          {t('voiceNote.multipleObjectivesHint')}
        </Text>}
        {loadingOptions ? <ActivityIndicator color={COLORS.primary} style={styles.sheetLoader} /> : (
          <>
            {(!crmOptions || !(optionSheet === 'action' ? crmOptions.actionsAvailable : crmOptions.objectivesAvailable)) && (
              <View style={styles.cardContent}>
                <Text variant="body" color={COLORS.textSecondary}>{t('voiceNote.crmOptionsUnavailable')}</Text>
                <Button title={t('voiceNote.resync')} variant="secondary" onPress={() => void loadCommunicationOptions()} />
              </View>
            )}
            {optionChoices.length > 0 ? (
              <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
                {optionChoices.map((option) => {
                  const selected = optionSheet === 'action' ? crmAction?.value === option.value : crmObjectives.some((item) => item.value === option.value);
                  return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.companyPicker}
                    onPress={() => {
                      if (optionSheet === 'action') {
                        setCrmAction(option);
                        setOptionSheet(null);
                      } else {
                        setCrmObjectives((current) => current.some((item) => item.value === option.value)
                          ? current.filter((item) => item.value !== option.value) : [...current, option]);
                      }
                    }}
                    accessibilityRole={optionSheet === 'objective' ? 'checkbox' : 'button'}
                    accessibilityState={optionSheet === 'objective' ? { checked: selected } : { selected }}
                  >
                    <Text variant="body" style={styles.flex}>{option.label}</Text>
                    {optionSheet === 'objective' && <View style={[styles.optionCheckbox, selected && styles.optionCheckboxSelected]}>
                      {selected && <Text variant="caption" color={COLORS.surface}>✓</Text>}
                    </View>}
                  </TouchableOpacity>
                ); })}
              </ScrollView>
            ) : crmOptions && (optionSheet === 'action' ? crmOptions.actionsAvailable : crmOptions.objectivesAvailable) ? (
              <Text variant="caption" color={COLORS.textMuted}>{t('voiceNote.crmOptionsEmpty')}</Text>
            ) : null}
            <Button title={t('voiceNote.clearCrmOption')} variant="secondary" onPress={() => {
              if (optionSheet === 'action') { setCrmAction(null); setOptionSheet(null); }
              else setCrmObjectives([]);
            }} style={styles.sheetButton} />
          </>
        )}
        {optionSheet === 'objective' && <Button title={t('voiceNote.objectivesDone')} onPress={() => setOptionSheet(null)} style={styles.sheetButton} />}
      </BottomSheet>

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
        <Text variant="label" style={styles.sheetTitle}>{t(meetingPickerTarget === 'end' ? 'voiceNote.selectMeetingEndAt' : 'voiceNote.selectMeetingAt')}</Text>
        <Text variant="caption" color={COLORS.textMuted} style={styles.sheetIntro}>
          {formatMeetingDateTime(activeMeetingAt)}
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
            const selected = dateKey(date) === dateKey(activeMeetingAt);
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
          onPress={() => { if (commitMeetingTime()) setMeetingSheetVisible(false); }}
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
  segmentText: {
    fontWeight: '700',
  },
  optionList: { maxHeight: 320 },
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
  optionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
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
