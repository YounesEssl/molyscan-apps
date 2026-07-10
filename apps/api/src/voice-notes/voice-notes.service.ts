import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptionService } from './transcription/transcription.service';
import { CrmService } from '../crm/crm.service';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';

@Injectable()
export class VoiceNotesService {
  private readonly logger = new Logger(VoiceNotesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private transcriptionService: TranscriptionService,
    private crmService: CrmService,
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
      where: { id, userId },
    });
    if (!note) throw new NotFoundException('Voice note not found');
    return this.format(note);
  }

  async create(userId: string, dto: CreateVoiceNoteDto, audioFile?: Express.Multer.File) {
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
      if (!transcription) {
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
        meetingAt: dto.meetingAt ? new Date(dto.meetingAt) : null,
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
  private async syncToCrm(note: {
    id: string;
    userId: string;
    companyId: string | null;
    clientName: string | null;
    contactId?: string | null;
    contactName?: string | null;
    meetingAt?: Date | null;
    productMentioned?: string | null;
    nextAction?: string | null;
    notes?: string | null;
    transcription: string | null;
    createdAt: Date;
  }) {
    if (!note.companyId) {
      // Pas de société sélectionnée → rien à pousser, on laisse "pending".
      return note;
    }

    try {
      const { id: crmCommunicationId } = await this.crmService.createCommunication(
        note.userId,
        {
          companyId: note.companyId,
          contactId: note.contactId,
          contactName: note.contactName,
          subject: note.clientName || 'Note vocale',
          note: this.buildCrmNote(note),
          datetime: note.meetingAt ?? note.createdAt,
        },
      );
      return this.prisma.voiceNote.update({
        where: { id: note.id },
        data: { syncStatus: 'synced', crmCommunicationId },
      });
    } catch (error) {
      this.logger.warn(`CRM sync failed for voice note ${note.id}: ${error}`);
      return this.prisma.voiceNote.update({
        where: { id: note.id },
        data: { syncStatus: 'failed' },
      });
    }
  }

  async update(id: string, userId: string, dto: UpdateVoiceNoteDto) {
    const existing = await this.prisma.voiceNote.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Voice note not found');

    const note = await this.prisma.voiceNote.update({
      where: { id },
      data: {
        ...(dto.transcription !== undefined && { transcription: dto.transcription }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.contactId !== undefined && { contactId: dto.contactId }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.meetingAt !== undefined && {
          meetingAt: dto.meetingAt ? new Date(dto.meetingAt) : null,
        }),
        ...(dto.productMentioned !== undefined && { productMentioned: dto.productMentioned }),
        ...(dto.nextAction !== undefined && { nextAction: dto.nextAction }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.format(note);
  }

  /** Re-pousse une note vocale en échec (ou jamais synchronisée) vers le CRM. */
  async resync(id: string, userId: string) {
    const note = await this.prisma.voiceNote.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundException('Voice note not found');
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
        return this.prisma.voiceNote.update({
          where: { id: note.id },
          data: { syncStatus: 'deleted' },
        });
      }),
    );

    return reconciled;
  }

  private format(note: any) {
    return {
      id: note.id,
      duration: note.duration,
      transcription: note.transcription,
      clientName: note.clientName || '',
      contactId: note.contactId || null,
      contactName: note.contactName || '',
      meetingAt: note.meetingAt ? note.meetingAt.toISOString() : null,
      productMentioned: note.productMentioned || '',
      nextAction: note.nextAction || '',
      notes: note.notes || '',
      companyId: note.companyId,
      relatedScanId: note.relatedScanId,
      syncStatus: note.syncStatus,
      crmCommunicationId: note.crmCommunicationId,
      createdAt: note.createdAt.toISOString(),
    };
  }

  private buildCrmNote(note: {
    transcription: string | null;
    contactName?: string | null;
    meetingAt?: Date | null;
    productMentioned?: string | null;
    nextAction?: string | null;
    notes?: string | null;
  }): string {
    const parts = [
      note.transcription?.trim(),
      note.meetingAt ? `Date du RDV : ${note.meetingAt.toLocaleString('fr-FR')}` : null,
      note.contactName?.trim() ? `Contact : ${note.contactName.trim()}` : null,
      note.productMentioned?.trim() ? `Produit : ${note.productMentioned.trim()}` : null,
      note.nextAction?.trim() ? `Prochaine action : ${note.nextAction.trim()}` : null,
      note.notes?.trim() ? `Notes : ${note.notes.trim()}` : null,
    ].filter((part): part is string => Boolean(part));

    return parts.join('\n\n');
  }
}
