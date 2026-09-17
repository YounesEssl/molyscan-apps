import type { VoiceNote } from '../schemas/voice-note.schema';

export interface VoiceNoteDraft {
  transcription: string;
  clientName: string;
  contactName: string;
  contactId: string | null;
  companyId: string | null;
  meetingAt: string | null;
  meetingEndAt: string | null;
  crmActionCode: string | null;
  crmObjectiveCodes: string[];
  productMentioned: string;
  nextAction: string;
  notes: string;
}

export function voiceNoteObjectives(note: VoiceNote): { value: string; label: string }[] {
  const codes = note.crmObjectiveCodes ?? (note.crmObjectiveCode ? [note.crmObjectiveCode] : []);
  return [...new Set(codes)].map((value) => ({
    value,
    label: note.crmObjectiveCodes !== undefined
      ? note.crmObjectiveLabels?.[codes.indexOf(value)] || (value === note.crmObjectiveCode ? note.crmObjectiveLabel : null) || value
      : note.crmObjectiveLabel || value,
  }));
}

function sameDraftValue(a: VoiceNoteDraft[keyof VoiceNoteDraft], b: VoiceNoteDraft[keyof VoiceNoteDraft]): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const first = new Set(a);
    const second = new Set(b);
    return first.size === second.size && [...first].every((value) => second.has(value));
  }
  return a === b;
}

export function voiceNoteToDraft(note: VoiceNote): VoiceNoteDraft {
  return {
    transcription: note.transcription ?? '',
    clientName: note.clientName,
    contactName: note.contactName ?? '',
    contactId: note.contactId ?? null,
    companyId: note.companyId ?? null,
    meetingAt: note.meetingAt ? new Date(note.meetingAt).toISOString() : null,
    meetingEndAt: note.meetingEndAt ? new Date(note.meetingEndAt).toISOString() : null,
    crmActionCode: note.crmActionCode ?? null,
    crmObjectiveCodes: voiceNoteObjectives(note).map((option) => option.value),
    productMentioned: note.productMentioned ?? '',
    nextAction: note.nextAction ?? '',
    notes: note.notes ?? '',
  };
}

/** Only send user edits; a missing date on a legacy note stays missing. */
export function voiceNoteDraftChanges(base: VoiceNoteDraft, current: VoiceNoteDraft): Partial<VoiceNoteDraft> {
  return Object.fromEntries(
    (Object.keys(base) as (keyof VoiceNoteDraft)[])
      .filter((key) => !sameDraftValue(base[key], current[key]))
      .map((key) => [key, current[key]]),
  );
}

/** Keep unsaved input while incorporating server changes to untouched fields. */
export function mergeVoiceNoteDraft(base: VoiceNoteDraft, current: VoiceNoteDraft, latest: VoiceNoteDraft) {
  const changes = voiceNoteDraftChanges(base, current);
  const conflicts = (Object.keys(changes) as (keyof VoiceNoteDraft)[])
    .filter((key) => !sameDraftValue(latest[key], base[key]) && !sameDraftValue(latest[key], current[key]));
  return { draft: { ...latest, ...changes }, conflicts };
}
