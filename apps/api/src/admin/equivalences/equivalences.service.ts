import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { equivalenceKey, normalizeProductText } from '../../common/utils/normalize';
import { CreateEquivalenceDto } from './dto/create-equivalence.dto';
import { UpdateEquivalenceDto } from './dto/update-equivalence.dto';

/** A scanned competitor product that has no expert-validated equivalence yet. */
export interface PendingEquivalence {
  scanIds: string[];
  competitorKey: string;
  competitorBrand: string;
  competitorName: string;
  currentGuess: string | null;
  compatibility: number | null;
  scanCount: number;
  lastScanAt: Date;
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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
        id: true,
        identifiedBrand: true,
        identifiedName: true,
        molydalEquivalent: true,
        equivalentFamily: true,
        compatibility: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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
        entry.scanIds.push(s.id);
      } else {
        seen.set(key, {
          scanIds: [s.id],
          competitorKey: key,
          competitorBrand: s.identifiedBrand ?? '',
          competitorName: s.identifiedName,
          currentGuess: s.molydalEquivalent,
          compatibility: s.compatibility,
          scanCount: 1,
          lastScanAt: s.createdAt,
          requestedBy: s.user,
        });
      }
    }
    return [...seen.values()].sort((a, b) => b.scanCount - a.scanCount);
  }

  async create(dto: CreateEquivalenceDto, validatedBy?: string) {
    const noEquivalent = dto.noEquivalent ?? false;
    const molydalEquivalent = noEquivalent ? '' : dto.molydalEquivalent?.trim();
    if (!noEquivalent && !molydalEquivalent) {
      throw new BadRequestException(
        'Indiquez un produit Molydal ou confirmez l’absence d’équivalent.',
      );
    }
    const competitorKey = equivalenceKey(
      dto.competitorBrand,
      dto.competitorName,
    );
    const existing = await this.prisma.expertEquivalence.findUnique({
      where: { competitorKey },
    });
    if (existing && (!dto.sourceScanIds?.length || existing.noEquivalent !== noEquivalent ||
      (!noEquivalent && normalizeProductText(existing.molydalEquivalent) !== normalizeProductText(molydalEquivalent)))) {
      throw new ConflictException(
        `Une équivalence existe déjà pour ${dto.competitorBrand} ${dto.competitorName}. Modifiez-la.`,
      );
    }
    const data = {
        competitorBrand: dto.competitorBrand.trim(),
        competitorName: dto.competitorName.trim(),
        competitorKey,
        molydalEquivalent: molydalEquivalent!,
        noEquivalent,
        molydalFamily: noEquivalent ? null : dto.molydalFamily?.trim() || null,
        confidence: noEquivalent ? 0 : (dto.confidence ?? 100),
        note: dto.note?.trim() || null,
        validatedBy: validatedBy ?? null,
        source: 'expert',
      } as const;
    if (!dto.sourceScanIds?.length) {
      return this.prisma.expertEquivalence.create({ data });
    }
    if (!dto.sourceCompetitorKey) {
      throw new BadRequestException('Origine des scans manquante.');
    }
    const scanIds = [...new Set(dto.sourceScanIds)];
    return this.prisma.$transaction(async (transaction) => {
      const scans = await transaction.scan.findMany({
        where: { id: { in: scanIds } },
        select: { id: true, identifiedBrand: true, identifiedName: true },
      });
      if (scans.length !== scanIds.length || scans.some((scan) =>
        equivalenceKey(scan.identifiedBrand, scan.identifiedName) !== dto.sourceCompetitorKey)) {
        throw new ConflictException('Les scans à valider ont changé. Actualisez la liste.');
      }
      const decision = existing ?? await transaction.expertEquivalence.create({ data });
      const reason = decision.note || (decision.noEquivalent
        ? 'Aucun équivalent confirmé par un expert Molydal.'
        : 'Équivalence validée par un expert Molydal.');
      await transaction.scan.updateMany({
        where: { id: { in: scanIds } },
        data: {
          identifiedBrand: dto.competitorBrand.trim(),
          identifiedName: dto.competitorName.trim(),
          status: decision.noEquivalent ? 'no_match' : (decision.confidence >= 70 ? 'matched' : 'partial'),
          molydalEquivalent: decision.noEquivalent ? null : decision.molydalEquivalent,
          equivalentFamily: decision.noEquivalent ? null : decision.molydalFamily,
          compatibility: decision.noEquivalent ? null : decision.confidence,
          equivalentsJson: decision.noEquivalent ? [] : [{
            name: decision.molydalEquivalent,
            family: decision.molydalFamily || '',
            compatibility: decision.confidence,
            reason,
          }],
          analysisText: reason,
        },
      });
      await transaction.aIConversation.updateMany({
        where: { scanId: { in: scanIds } },
        data: {
          scannedBrand: dto.competitorBrand.trim(),
          scannedName: dto.competitorName.trim(),
          molydalName: decision.noEquivalent ? null : decision.molydalEquivalent,
          molydalReference: null,
        },
      });
      return decision;
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

    const competitorBrand =
      dto.competitorBrand?.trim() ?? current.competitorBrand;
    const competitorName = dto.competitorName?.trim() ?? current.competitorName;
    const competitorKey = equivalenceKey(competitorBrand, competitorName);
    const noEquivalent = dto.noEquivalent ?? current.noEquivalent;
    const molydalEquivalent = noEquivalent
      ? ''
      : (dto.molydalEquivalent?.trim() ?? current.molydalEquivalent);
    if (!noEquivalent && !molydalEquivalent) {
      throw new BadRequestException(
        'Indiquez le produit Molydal avant de rétablir une équivalence.',
      );
    }

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
        noEquivalent,
        molydalEquivalent,
        molydalFamily: noEquivalent
          ? null
          : dto.molydalFamily !== undefined
            ? dto.molydalFamily?.trim() || null
            : current.molydalFamily,
        confidence: noEquivalent
          ? 0
          : (dto.confidence ??
            (current.noEquivalent ? 100 : current.confidence)),
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
