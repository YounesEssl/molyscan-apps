import { VoiceNoteSchema } from '../schemas/voice-note.schema';
import { mergeVoiceNoteDraft, voiceNoteDraftChanges, voiceNoteToDraft, voiceNoteObjectives } from './voiceNoteDraft';

const note = VoiceNoteSchema.parse({
  id: 'note-1', revision: 4, duration: 90, transcription: 'Compte rendu initial',
  clientName: 'Client', createdAt: '2026-09-17T08:00:00.000Z', notes: 'Initial',
  contactId: 'contact-1', companyId: 'company-1', crmActionCode: 'visit',
});

describe('CRM note edit drafts', () => {
  it('keeps legacy dates absent instead of silently inventing appointment dates', () => {
    const draft = voiceNoteToDraft(note);
    expect(draft.meetingAt).toBeNull();
    expect(draft.meetingEndAt).toBeNull();
    expect(voiceNoteDraftChanges(draft, { ...draft, notes: 'Corrigé' })).toEqual({ notes: 'Corrigé' });
  });

  it('sends intentional cleared relationships and options as null', () => {
    const base = voiceNoteToDraft(note);
    expect(voiceNoteDraftChanges(base, { ...base, contactId: null, crmActionCode: null })).toEqual({
      contactId: null, crmActionCode: null,
    });
  });

  it('retains local input while merging remotely edited untouched fields after a conflict', () => {
    const base = voiceNoteToDraft(note);
    const local = { ...base, transcription: 'Saisie non enregistrée' };
    const latest = { ...base, notes: 'Autre modification distante' };
    const merged = mergeVoiceNoteDraft(base, local, latest);
    expect(merged.draft.transcription).toBe(local.transcription);
    expect(merged.draft.notes).toBe(latest.notes);
    expect(merged.conflicts).toEqual([]);
    expect(voiceNoteDraftChanges(latest, merged.draft)).toEqual({ transcription: local.transcription });
  });

  it('keeps the local version and reports conflicts when both users changed a field', () => {
    const base = voiceNoteToDraft(note);
    const local = { ...base, notes: 'Ma correction', contactId: null };
    const latest = { ...base, notes: 'Correction distante', contactId: 'contact-2' };
    const merged = mergeVoiceNoteDraft(base, local, latest);
    expect(merged.draft.notes).toBe('Ma correction');
    expect(merged.draft.contactId).toBeNull();
    expect(merged.conflicts).toEqual(expect.arrayContaining(['notes', 'contactId']));
  });

  it('does not report a conflict when the server already contains the same change', () => {
    const base = voiceNoteToDraft(note);
    const local = { ...base, notes: 'Corrigé' };
    const merged = mergeVoiceNoteDraft(base, local, local);
    expect(merged.conflicts).toEqual([]);
    expect(voiceNoteDraftChanges(local, merged.draft)).toEqual({});
  });

  it('loads legacy objectives only when the new objective array is absent', () => {
    const legacy = { ...note, crmObjectiveCode: 'visit', crmObjectiveLabel: 'Visite' };
    expect(voiceNoteObjectives(legacy)).toEqual([{ value: 'visit', label: 'Visite' }]);
    expect(voiceNoteToDraft(legacy).crmObjectiveCodes).toEqual(['visit']);
    expect(voiceNoteToDraft({ ...legacy, crmObjectiveCodes: [] }).crmObjectiveCodes).toEqual([]);
  });

  it('preserves multiple saved labels and uses the actual saved code when a label is absent', () => {
    expect(voiceNoteObjectives({ ...note, crmObjectiveCodes: ['sample', 'visit', 'sample'], crmObjectiveLabels: ['Échantillon'] }))
      .toEqual([{ value: 'sample', label: 'Échantillon' }, { value: 'visit', label: 'visit' }]);
  });

  it('compares objective contents as a set to avoid dirty forms after loading or reordering', () => {
    const base = voiceNoteToDraft({ ...note, crmObjectiveCodes: ['visit', 'sample'] });
    expect(voiceNoteDraftChanges(base, { ...base, crmObjectiveCodes: ['sample', 'visit'] })).toEqual({});
    expect(voiceNoteDraftChanges(base, { ...base, crmObjectiveCodes: ['visit', 'sample', 'visit'] })).toEqual({});
    expect(voiceNoteDraftChanges(base, { ...base, crmObjectiveCodes: [] })).toEqual({ crmObjectiveCodes: [] });
  });

  it('retains locally selected objectives and reports a conflict if the remote selection differs', () => {
    const base = voiceNoteToDraft({ ...note, crmObjectiveCodes: ['visit'] });
    const local = { ...base, crmObjectiveCodes: ['visit', 'sample'] };
    const latest = { ...base, crmObjectiveCodes: ['delivery'] };
    const merged = mergeVoiceNoteDraft(base, local, latest);
    expect(merged.draft.crmObjectiveCodes).toEqual(['visit', 'sample']);
    expect(merged.conflicts).toEqual(['crmObjectiveCodes']);
    expect(voiceNoteDraftChanges(latest, merged.draft)).toEqual({ crmObjectiveCodes: ['visit', 'sample'] });
  });

  it('merges remote objectives when untouched locally and accepts equivalent remote sets', () => {
    const base = voiceNoteToDraft({ ...note, crmObjectiveCodes: ['visit'] });
    const local = { ...base, notes: 'Correction' };
    const latest = { ...base, crmObjectiveCodes: ['sample', 'visit'] };
    expect(mergeVoiceNoteDraft(base, local, latest).draft.crmObjectiveCodes).toEqual(latest.crmObjectiveCodes);
    expect(mergeVoiceNoteDraft(base, { ...local, crmObjectiveCodes: ['visit', 'sample'] }, latest).conflicts).toEqual([]);
  });
});
