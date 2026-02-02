import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptionService } from './transcription/transcription.service';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { UpdateVoiceNoteDto } from './dto/update-voice-note.dto';

@Injectable()
export class VoiceNotesService {
  private readonly logger = new Logger(VoiceNotesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private transcriptionService: TranscriptionService,
  ) {}

  async findAll(userId: string) {
    const notes = await this.prisma.voiceNote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return notes.map((n) => this.format(n));
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
    let transcription: string | null = null;

    // Upload audio to MinIO if provided
    if (audioFile) {
      audioKey = `voice-notes/${userId}/${Date.now()}-${audioFile.originalname}`;
      try {
        await this.storageService.upload(audioKey, audioFile.buffer, audioFile.mimetype);
      } catch (error) {
        this.logger.warn(`Audio upload failed: ${error}`);
      }

      // Transcribe audio
      transcription = await this.transcriptionService.transcribe(audioFile.buffer);
    }

    const note = await this.prisma.voiceNote.create({
      data: {
        duration: dto.duration,
        audioKey,
        transcription,
        clientName: dto.clientName,
        tags: dto.tags || [],
        relatedScanId: dto.relatedScanId,
        userId,
      },
    });

    return this.format(note);
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
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.productMentioned !== undefined && { productMentioned: dto.productMentioned }),
        ...(dto.nextAction !== undefined && { nextAction: dto.nextAction }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });

    return this.format(note);
  }

  private format(note: any) {
    return {
      id: note.id,
      duration: note.duration,
      transcription: note.transcription,
      clientName: note.clientName || '',
      relatedScanId: note.relatedScanId,
      tags: note.tags,
      createdAt: note.createdAt.toISOString(),
    };
  }
}
