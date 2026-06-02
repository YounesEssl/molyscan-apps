import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { equivalenceKey } from '../../common/utils/normalize';
import { CreateEquivalenceDto } from './dto/create-equivalence.dto';
import { UpdateEquivalenceDto } from './dto/update-equivalence.dto';

/** A scanned competitor product that has no expert-validated equivalence yet. */
export interface PendingEquivalence {
  competitorBrand: string;
  competitorName: string;
  currentGuess: string | null;
  compatibility: number | null;
  scanCount: number;
  lastScanAt: Date;
}

@Injectable()
export class EquivalencesService {
  private readonly logger = new Logger(EquivalencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string) {
    const where: Prisma.ExpertEquivalenceWhereInput = search?.trim()
      ? {
          OR: [
            { competitorBrand: { contains: search, mode: 'insensitive' } },
            { competitorName: { contains: search, mode: 'insensitive' } },
            { molydalEquivalent: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.expertEquivalence.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Competitors that have been scanned but are NOT yet in the equivalence table —
   * the expert's validation queue. Ordered by how often they've been scanned.
   */
  async listPending(): Promise<PendingEquivalence[]> {
    const recent = await this.prisma.scan.findMany({
      where: { identifiedName: { not: null } },
      select: {
        identifiedBrand: true,
        identifiedName: true,
        molydalEquivalent: true,
        equivalentFamily: true,
        compatibility: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const existing = new Set(
      (
        await this.prisma.expertEquivalence.findMany({
          select: { competitorKey: true },
        })
      ).map((e) => e.competitorKey),
    );

    const seen = new Map<string, PendingEquivalence>();
    for (const s of recent) {
      if (!s.identifiedName) continue;
      const key = equivalenceKey(s.identifiedBrand, s.identifiedName);
      if (existing.has(key)) continue;
      const entry = seen.get(key);
      if (entry) {
        entry.scanCount += 1;
      } else {
        seen.set(key, {
          competitorBrand: s.identifiedBrand ?? '',
          competitorName: s.identifiedName,
          currentGuess: s.molydalEquivalent,
          compatibility: s.compatibility,
          scanCount: 1,
          lastScanAt: s.createdAt,
        });
      }
    }
    return [...seen.values()].sort((a, b) => b.scanCount - a.scanCount);
  }

  async create(dto: CreateEquivalenceDto, validatedBy?: string) {
    const competitorKey = equivalenceKey(dto.competitorBrand, dto.competitorName);
    const existing = await this.prisma.expertEquivalence.findUnique({
      where: { competitorKey },
    });
    if (existing) {
      throw new ConflictException(
        `Une équivalence existe déjà pour ${dto.competitorBrand} ${dto.competitorName}. Modifiez-la.`,
      );
    }
    return this.prisma.expertEquivalence.create({
      data: {
        competitorBrand: dto.competitorBrand.trim(),
        competitorName: dto.competitorName.trim(),
        competitorKey,
        molydalEquivalent: dto.molydalEquivalent.trim(),
        molydalFamily: dto.molydalFamily?.trim() || null,
        confidence: dto.confidence ?? 100,
        note: dto.note?.trim() || null,
        validatedBy: validatedBy ?? null,
        source: 'expert',
      },
    });
  }

  async findById(id: string) {
    const equivalence = await this.prisma.expertEquivalence.findUnique({
      where: { id },
    });
    if (!equivalence) {
      throw new NotFoundException('Équivalence introuvable.');
    }
    return equivalence;
  }

  async update(id: string, dto: UpdateEquivalenceDto, validatedBy?: string) {
    const current = await this.findById(id);

    const competitorBrand = dto.competitorBrand?.trim() ?? current.competitorBrand;
    const competitorName = dto.competitorName?.trim() ?? current.competitorName;
    const competitorKey = equivalenceKey(competitorBrand, competitorName);

    // If the key changed, ensure it doesn't collide with another entry.
    if (competitorKey !== current.competitorKey) {
      const clash = await this.prisma.expertEquivalence.findUnique({
        where: { competitorKey },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(
          'Une autre équivalence cible déjà ce produit concurrent.',
        );
      }
    }

    return this.prisma.expertEquivalence.update({
      where: { id },
      data: {
        competitorBrand,
        competitorName,
        competitorKey,
        molydalEquivalent:
          dto.molydalEquivalent?.trim() ?? current.molydalEquivalent,
        molydalFamily:
          dto.molydalFamily !== undefined
            ? dto.molydalFamily?.trim() || null
            : current.molydalFamily,
        confidence: dto.confidence ?? current.confidence,
        note: dto.note !== undefined ? dto.note?.trim() || null : current.note,
        validatedBy: validatedBy ?? current.validatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.expertEquivalence.delete({ where: { id } });
    return { success: true, id };
  }
}
