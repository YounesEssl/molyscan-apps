import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { EquivalencesService } from './equivalences.service';
import { CreateEquivalenceDto } from './dto/create-equivalence.dto';

describe('Expert equivalence decisions', () => {
  const current = {
    id: 'decision-1',
    competitorBrand: 'Molykote',
    competitorName: 'BR-2',
    competitorKey: 'molykote|br 2',
    molydalEquivalent: 'MO/3',
    molydalFamily: 'GRAISSES',
    noEquivalent: false,
    confidence: 90,
    note: null,
    validatedBy: 'expert@example.test',
  };
  let prisma: {
    $transaction: jest.Mock;
    scan: { findMany: jest.Mock; updateMany: jest.Mock };
    aIConversation: { updateMany: jest.Mock };
    expertEquivalence: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: EquivalencesService;
  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      scan: { findMany: jest.fn(), updateMany: jest.fn() },
      aIConversation: { updateMany: jest.fn() },
      expertEquivalence: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new EquivalencesService(prisma as unknown as PrismaService);
  });

  it('persists explicit absence without a fabricated equivalent or confidence', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue(null);
    await service.create(
      {
        competitorBrand: 'Molykote',
        competitorName: 'BR-2',
        noEquivalent: true,
        molydalEquivalent: 'stale answer',
        confidence: 100,
      },
      'admin@example.test',
    );
    expect(prisma.expertEquivalence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        noEquivalent: true,
        molydalEquivalent: '',
        molydalFamily: null,
        confidence: 0,
        validatedBy: 'admin@example.test',
      }),
    });
  });

  it('clears an old answer when the expert declares no equivalent', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue(current);
    await service.update(current.id, { noEquivalent: true });
    expect(prisma.expertEquivalence.update).toHaveBeenCalledWith({
      where: { id: current.id },
      data: expect.objectContaining({
        noEquivalent: true,
        molydalEquivalent: '',
        molydalFamily: null,
        confidence: 0,
      }),
    });
  });

  it('requires a product before reversing an absence decision', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue({
      ...current,
      noEquivalent: true,
      molydalEquivalent: '',
      confidence: 0,
    });
    await expect(
      service.update(current.id, { noEquivalent: false }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.expertEquivalence.update).not.toHaveBeenCalled();
    await service.update(current.id, {
      noEquivalent: false,
      molydalEquivalent: 'NEW PRODUCT',
    });
    expect(prisma.expertEquivalence.update).toHaveBeenCalledWith({
      where: { id: current.id },
      data: expect.objectContaining({
        noEquivalent: false,
        molydalEquivalent: 'NEW PRODUCT',
        confidence: 100,
      }),
    });
  });

  it('rejects a normal equivalence with no product', async () => {
    await expect(
      service.create({
        competitorBrand: 'Molykote',
        competitorName: 'BR-2',
        molydalEquivalent: ' ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('corrects scans with an unread brand when an expert validates them', async () => {
    const scanId = 'db081aa8-a248-4cd0-b64b-2b46326af239';
    prisma.expertEquivalence.findUnique.mockResolvedValue(null);
    prisma.scan.findMany.mockResolvedValue([{ id: scanId, identifiedBrand: null, identifiedName: 'BR-2' }]);
    prisma.expertEquivalence.create.mockResolvedValue(current);
    await service.create({
      competitorBrand: 'Molykote', competitorName: 'BR-2', molydalEquivalent: 'MO/3',
      sourceScanIds: [scanId], sourceCompetitorKey: '|br 2',
    });
    expect(prisma.scan.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [scanId] } },
      data: expect.objectContaining({
        identifiedBrand: 'Molykote', identifiedName: 'BR-2',
        molydalEquivalent: 'MO/3', status: 'matched',
      }),
    }));
    expect(prisma.aIConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scannedBrand: 'Molykote', scannedName: 'BR-2' }),
    }));
  });

  it('refuses to reassign a scan whose source identity changed', async () => {
    const scanId = 'db081aa8-a248-4cd0-b64b-2b46326af239';
    prisma.expertEquivalence.findUnique.mockResolvedValue(null);
    prisma.scan.findMany.mockResolvedValue([{ id: scanId, identifiedBrand: 'Shell', identifiedName: 'BR-2' }]);
    await expect(service.create({
      competitorBrand: 'Molykote', competitorName: 'BR-2', molydalEquivalent: 'MO/3',
      sourceScanIds: [scanId], sourceCompetitorKey: '|br 2',
    })).rejects.toThrow(ConflictException);
    expect(prisma.expertEquivalence.create).not.toHaveBeenCalled();
    expect(prisma.scan.updateMany).not.toHaveBeenCalled();
  });

  it('links a pending scan to an identical existing expert decision', async () => {
    const scanId = 'db081aa8-a248-4cd0-b64b-2b46326af239';
    prisma.expertEquivalence.findUnique.mockResolvedValue(current);
    prisma.scan.findMany.mockResolvedValue([{ id: scanId, identifiedBrand: null, identifiedName: 'BR-2' }]);
    const result = await service.create({
      competitorBrand: 'Molykote', competitorName: 'BR-2', molydalEquivalent: 'MO/3',
      sourceScanIds: [scanId], sourceCompetitorKey: '|br 2',
    });
    expect(result).toBe(current);
    expect(prisma.expertEquivalence.create).not.toHaveBeenCalled();
    expect(prisma.scan.updateMany).toHaveBeenCalledTimes(1);
  });

  it('only deletes the targeted expert decision', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue(current);
    await expect(service.remove(current.id)).resolves.toEqual({
      success: true,
      id: current.id,
    });
    expect(prisma.expertEquivalence.delete).toHaveBeenCalledWith({
      where: { id: current.id },
    });
  });

  it('validates a real boolean and trims product identity before checking emptiness', async () => {
    const make = (body: object) =>
      plainToInstance(CreateEquivalenceDto, body, {
        enableImplicitConversion: true,
      });
    const base = {
      competitorBrand: ' Molykote ',
      competitorName: 'BR-2',
      noEquivalent: true,
    };
    expect(await validate(make(base))).toEqual([]);
    expect(await validate(make({ ...base, competitorName: '   ' }))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'competitorName' }),
      ]),
    );
    expect(await validate(make({ ...base, noEquivalent: 'false' }))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'noEquivalent' }),
      ]),
    );
    expect(await validate(make({ ...base, noEquivalent: false }))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'molydalEquivalent' }),
      ]),
    );
  });
});
