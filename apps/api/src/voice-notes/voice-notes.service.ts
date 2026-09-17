import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { VoiceNote, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptionService } from './transcription/transcription.service';
import { CrmService } from '../crm/crm.service';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';
import { objectiveCodesFromDto } from './dto/crm-objectives';
import { FeaturesService } from '../features/features.service';

@Injectable()
export class VoiceNotesService {
  private readonly logger = new Logger(VoiceNotesService.name);
  private readonly syncLeaseMs = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private transcriptionService: TranscriptionService,
    private crmService: CrmService,
    private features: FeaturesService,
  ) {}

  async findAll(userId: string) {
    const notes = await this.prisma.voiceNote.findMany({
      where: { userId, syncStatus: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
    });
    const reconciled = await this.reconcileDeletedCrmCommunications(notes);
    return reconciled
      .filter((n) => n.syncStatus !== 'deleted')
      .map((n) => this.format(n));
  }

  async findById(id: string, userId: string) {
    const note = await this.prisma.voiceNote.findFirst({
      where: { id, userId, syncStatus: { not: 'deleted' } },
    });
    if (!note) throw new NotFoundException('Voice note not found');
    return this.format(note);
  }

  async create(userId: string, dto: CreateVoiceNoteDto, audioFile?: Express.Multer.File) {
    const meetingAt = dto.meetingAt ? new Date(dto.meetingAt) : null;
    const meetingEndAt = dto.meetingEndAt ? new Date(dto.meetingEndAt) : null;
    if (meetingEndAt && (!meetingAt || meetingEndAt <= meetingAt)) {
      throw new BadRequestException('Appointment end must be after its start');
    }
    const objectiveCodes = objectiveCodesFromDto(dto) ?? [];
    const selection = await this.crmService.validateCommunicationSelection(userId, dto.crmActionCode, objectiveCodes);
    let audioKey: string | null = null;
    // Le mobile transcrit déjà via /chat/transcribe et envoie le texte (éventuellement
    // édité) : on le privilégie. Fallback Whisper serveur seulement s'il est absent.
    let transcription: string | null = dto.transcription?.trim() || null;

    // Upload audio to MinIO if provided
    if (audioFile) {
      audioKey = `voice-notes/${userId}/${Date.now()}-${audioFile.originalname}`;
      try {
        await this.storageService.upload(audioKey, audioFile.buffer, audioFile.mimetype);
      } catch (error) {
        this.logger.warn(`Audio upload failed: ${error}`);
      }

      // Transcription serveur uniquement si le mobile n'en a pas fourni.
      if (dto.transcription === undefined) {
        transcription = await this.transcriptionService.transcribe(
          audioFile.buffer,
          audioFile.originalname,
        );
      }
    }

    const note = await this.prisma.voiceNote.create({
      data: {
        duration: dto.duration,
        audioKey,
        transcription,
        clientName: dto.clientName,
        contactId: dto.contactId,
        contactName: dto.contactName,
        meetingAt,
        meetingEndAt,
        ...selection,
        crmObjectiveCodes: objectiveCodes,
        crmObjectiveLabels: selection.crmObjectiveLabels ?? [],
        crmObjectiveCode: objectiveCodes[0] ?? null,
        crmObjectiveLabel: selection.crmObjectiveLabels?.[0] ?? null,
        productMentioned: dto.productMentioned,
        nextAction: dto.nextAction,
        notes: dto.notes,
        companyId: dto.companyId,
        relatedScanId: dto.relatedScanId,
        userId,
      },
    });

    const synced = await this.syncToCrm(note);
    return this.format(synced);
  }

  /**
   * Pousse la note vocale dans le CRM en tant que communication.
   * Non bloquant : si la sync échoue (pas de société, pas d'identifiants CRM,
   * CRM injoignable…), la note reste enregistrée avec syncStatus='failed'.
   */
  private async syncToCrm(note: VoiceNote) {
    // Initial sends and their unchanged retries remain part of the base CRM
    // flow. A saved historical edit must never bypass the paid feature gate,
    // including from older mobile versions or after the feature is revoked.
    if (note.revision !== 0) this.features.assertCrmHistoryEditingEnabled();
    if (!note.companyId) {
      return note;
    }
    if (note.syncStatus === 'synced' || note.syncErrorCode === 'legacy_uncertain') return note;

    const token = randomUUID();
    const communicationId = note.crmCommunicationId || randomUUID();
    const acquired = await this.prisma.voiceNote.updateMany({
      where: { id: note.id, userId: note.userId, revision: note.revision,
        syncStatus: { notIn: ['synced', 'deleted'] }, ...this.availableSyncLock() },
      data: { crmSyncToken: token, crmSyncStartedAt: new Date(), syncStatus: 'syncing',
        crmCommunicationId: communicationId, syncErrorCode: null },
    });
    if (!acquired.count) throw new ConflictException('Voice note changed or CRM synchronization is already running');

    try {
      const record = {
          companyId: note.companyId,
          contactId: note.contactId,
          contactName: note.contactName,
          subject: note.clientName || 'Note vocale',
          note: this.buildCrmNote(note),
          datetime: note.meetingAt ?? note.createdAt,
          endDatetime: note.meetingEndAt ?? undefined,
          actionCode: note.crmActionCode ?? undefined,
          objectiveCodes: this.noteObjectiveCodes(note),
        };
      // The ID is persisted BEFORE the HTTP request. A retry first reconciles
      // the remote outcome; a timeout must never cause a fresh random ID.
      const exists = note.crmCommunicationId
        ? await this.crmService.communicationExists(note.userId, communicationId)
        : false;
      if (exists === null) throw new CrmSyncFailure('crm_unavailable');
      if (exists === false && note.crmSyncedRevision !== null) {
        throw new CrmSyncFailure('remote_deleted');
      }
      if (exists) {
        await this.crmService.updateCommunication(note.userId, communicationId, record);
      } else {
        await this.crmService.createCommunication(note.userId, record, communicationId);
      }
      await this.finishSync(note, token, {
        syncStatus: 'synced', crmSyncedRevision: note.revision, syncErrorCode: null,
      });
    } catch (error) {
      this.logger.warn(`CRM sync failed for voice note ${note.id}: ${error}`);
      await this.finishSync(note, token, {
        syncStatus: 'failed',
        syncErrorCode: error instanceof CrmSyncFailure ? error.code
          : (error as { syncErrorCode?: string })?.syncErrorCode === 'update_unavailable'
            ? 'update_unavailable' : 'crm_unavailable',
      });
    }
    // If another worker took over an expired lease, report the current state,
    // never the stale request's idea of success.
    return this.prisma.voiceNote.findUniqueOrThrow({ where: { id: note.id } });
  }

  private availableSyncLock(): Prisma.VoiceNoteWhereInput {
    return { OR: [
      { crmSyncToken: null },
      { crmSyncStartedAt: { lt: new Date(Date.now() - this.syncLeaseMs) } },
    ] };
  }

  private async finishSync(note: VoiceNote, token: string, data: Prisma.VoiceNoteUpdateManyMutationInput) {
    await this.prisma.voiceNote.updateMany({
      where: { id: note.id, userId: note.userId, revision: note.revision, crmSyncToken: token },
      data: { ...data, crmSyncToken: null, crmSyncStartedAt: null },
    });
  }

  async update(id: string, userId: string, dto: UpdateVoiceNoteDto) {
    this.features.assertCrmHistoryEditingEnabled();
    const existing = await this.prisma.voiceNote.findFirst({
      where: { id, userId, syncStatus: { not: 'deleted' } },
    });
    if (!existing) throw new NotFoundException('Voice note not found');
    if (existing.revision !== dto.expectedRevision) throw new ConflictException('Voice note changed. Reload it before saving.');

    const changes: Partial<VoiceNote> = {};
    const textFields = ['transcription', 'clientName', 'companyId', 'contactId', 'contactName',
      'productMentioned', 'nextAction', 'notes'] as const;
    for (const field of textFields) {
      if (dto[field] !== undefined) changes[field] = dto[field]?.trim() || null;
    }
    if (changes.companyId !== undefined && changes.companyId !== existing.companyId) {
      if (dto.contactId === undefined) changes.contactId = null;
      if (dto.contactName === undefined) changes.contactName = null;
    }
    if (changes.contactId === null && dto.contactName === undefined) changes.contactName = null;
    if (existing.crmCommunicationId && (
      (changes.companyId !== undefined && changes.companyId !== existing.companyId) ||
      (changes.contactId !== undefined && changes.contactId !== existing.contactId)
    )) {
      throw new BadRequestException('The CRM company and contact of a linked note cannot be changed');
    }
    if (dto.meetingAt !== undefined) changes.meetingAt = dto.meetingAt ? new Date(dto.meetingAt) : null;
    if (dto.meetingEndAt !== undefined) changes.meetingEndAt = dto.meetingEndAt ? new Date(dto.meetingEndAt) : null;
    if (changes.meetingAt === null && dto.meetingEndAt === undefined) changes.meetingEndAt = null;
    const start = changes.meetingAt !== undefined ? changes.meetingAt : existing.meetingAt;
    const end = changes.meetingEndAt !== undefined ? changes.meetingEndAt : existing.meetingEndAt;
    if (end && (!start || end <= start)) throw new BadRequestException('Appointment end must be after its start');

    const action = dto.crmActionCode?.trim() || null;
    const objectives = objectiveCodesFromDto(dto);
    const previousObjectives = this.noteObjectiveCodes(existing);
    const actionChanged = dto.crmActionCode !== undefined && action !== existing.crmActionCode;
    const objectiveChanged = objectives !== undefined &&
      (objectives.length !== previousObjectives.length || objectives.some((code) => !previousObjectives.includes(code)));
    if (actionChanged || objectiveChanged) {
      const selected = await this.crmService.validateCommunicationSelection(userId,
        actionChanged ? action ?? undefined : undefined, objectiveChanged ? objectives : undefined);
      if (actionChanged) Object.assign(changes, { crmActionCode: action, crmActionLabel: selected.crmActionLabel ?? null });
      if (objectiveChanged) Object.assign(changes, {
        crmObjectiveCodes: objectives, crmObjectiveLabels: selected.crmObjectiveLabels ?? [],
        crmObjectiveCode: objectives?.[0] ?? null, crmObjectiveLabel: selected.crmObjectiveLabels?.[0] ?? null,
      });
    }

    const differs = Object.entries(changes).some(([key, value]) => {
      const previous = existing[key as keyof VoiceNote];
      if (Array.isArray(value) && Array.isArray(previous)) return JSON.stringify(value) !== JSON.stringify(previous);
      return value instanceof Date && previous instanceof Date ? value.getTime() !== previous.getTime() : value !== previous;
    });
    if (!differs) return this.format(existing);

    const saved = await this.prisma.voiceNote.updateMany({
      where: { id, userId, revision: dto.expectedRevision, syncStatus: { not: 'deleted' }, ...this.availableSyncLock() },
      data: { ...changes, revision: { increment: 1 }, syncStatus: 'pending',
        syncErrorCode: existing.syncErrorCode === 'legacy_uncertain' ? 'legacy_uncertain' : null,
        crmSyncToken: null, crmSyncStartedAt: null },
    });
    if (!saved.count) throw new ConflictException('Voice note changed or CRM synchronization is already running');
    return this.findById(id, userId);
  }

  /** Sends the current revision, updating the same remote communication. */
  async resync(id: string, userId: string, expectedRevision?: number) {
    const note = await this.prisma.voiceNote.findFirst({ where: { id, userId, syncStatus: { not: 'deleted' } } });
    if (!note) throw new NotFoundException('Voice note not found');
    if (expectedRevision !== undefined && note.revision !== expectedRevision) throw new ConflictException('Voice note changed. Reload it before sending.');
    if (!note.companyId) throw new BadRequestException('Select a CRM company before sending');
    const synced = await this.syncToCrm(note);
    return this.format(synced);
  }

  private async reconcileDeletedCrmCommunications(notes: any[]) {
    const reconciled = await Promise.all(
      notes.map(async (note) => {
        if (note.syncStatus !== 'synced' || !note.crmCommunicationId) {
          return note;
        }

        const exists = await this.crmService.communicationExists(
          note.userId,
          note.crmCommunicationId,
        );
        if (exists !== false) return note;

        this.logger.log(
          `CRM communication ${note.crmCommunicationId} no longer exists; hiding voice note ${note.id}`,
        );
        await this.prisma.voiceNote.updateMany({
          where: { id: note.id, revision: note.revision, syncStatus: 'synced', crmSyncToken: null },
          data: { syncStatus: 'deleted' },
        });
        return this.prisma.voiceNote.findUniqueOrThrow({ where: { id: note.id } });
      }),
    );

    return reconciled;
  }

  private format(note: any) {
    const interrupted = note.syncStatus === 'syncing' && note.crmSyncStartedAt &&
      note.crmSyncStartedAt.getTime() < Date.now() - this.syncLeaseMs;
    return {
      id: note.id,
      duration: note.duration,
      transcription: note.transcription,
      clientName: note.clientName || '',
      contactId: note.contactId || null,
      contactName: note.contactName || '',
      meetingAt: note.meetingAt ? note.meetingAt.toISOString() : null,
      meetingEndAt: note.meetingEndAt ? note.meetingEndAt.toISOString() : null,
      crmActionCode: note.crmActionCode ?? null,
      crmActionLabel: note.crmActionLabel ?? null,
      crmObjectiveCode: note.crmObjectiveCode ?? null,
      crmObjectiveLabel: note.crmObjectiveLabel ?? null,
      crmObjectiveCodes: this.noteObjectiveCodes(note),
      crmObjectiveLabels: this.noteObjectiveLabels(note),
      productMentioned: note.productMentioned || '',
      nextAction: note.nextAction || '',
      notes: note.notes || '',
      companyId: note.companyId,
      relatedScanId: note.relatedScanId,
      // A crashed worker must not leave the mobile permanently disabled. The
      // database lease is checked atomically again when an edit/retry is made.
      syncStatus: interrupted ? 'failed' : note.syncStatus,
      crmCommunicationId: note.crmCommunicationId,
      revision: note.revision,
      crmSyncedRevision: note.crmSyncedRevision,
      syncErrorCode: interrupted ? 'crm_unavailable' : note.syncErrorCode,
      crmUpdateAvailable: this.features.isCrmHistoryEditingEnabled() && this.crmService.canUpdateCommunication(),
      createdAt: note.createdAt.toISOString(),
    };
  }

  private noteObjectiveCodes(note: { crmObjectiveCodes?: string[]; crmObjectiveCode?: string | null }): string[] {
    return note.crmObjectiveCodes ?? (note.crmObjectiveCode ? [note.crmObjectiveCode] : []);
  }

  private noteObjectiveLabels(note: { crmObjectiveLabels?: string[]; crmObjectiveLabel?: string | null }): string[] {
    return note.crmObjectiveLabels ?? (note.crmObjectiveLabel ? [note.crmObjectiveLabel] : []);
  }

  private buildCrmNote(note: {
    transcription: string | null;
    contactName?: string | null;
    meetingAt?: Date | null;
    meetingEndAt?: Date | null;
    crmActionCode?: string | null;
    crmActionLabel?: string | null;
    crmObjectiveCode?: string | null;
    crmObjectiveLabel?: string | null;
    crmObjectiveLabels?: string[];
    productMentioned?: string | null;
    nextAction?: string | null;
    notes?: string | null;
  }): string {
    const parts = [
      note.transcription?.trim(),
      note.meetingAt ? `Date du RDV : ${this.crmService.formatDateTime(note.meetingAt)}` : null,
      note.meetingEndAt ? `Fin du RDV : ${this.crmService.formatDateTime(note.meetingEndAt)}` : null,
      note.crmActionLabel ? `Action : ${note.crmActionLabel}` : null,
      this.noteObjectiveLabels(note).length ? `Objectifs : ${this.noteObjectiveLabels(note).join(', ')}` : null,
      note.contactName?.trim() ? `Contact : ${note.contactName.trim()}` : null,
      note.productMentioned?.trim() ? `Produit : ${note.productMentioned.trim()}` : null,
      note.nextAction?.trim() ? `Prochaine action : ${note.nextAction.trim()}` : null,
      note.notes?.trim() ? `Notes : ${note.notes.trim()}` : null,
    ].filter((part): part is string => Boolean(part));

    return parts.join('\n\n');
  }
}

class CrmSyncFailure extends Error {
  constructor(readonly code: string) { super(code); }
}
