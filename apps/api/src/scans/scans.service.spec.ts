import { ScansService } from './scans.service';

describe('Scan feedback', () => {
  let service: ScansService;
  let prisma: any;
  beforeEach(() => {
    prisma = {
      scan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'scan', molydalEquivalent: 'H 125 AL', equivalentsJson: [] }),
        delete: jest.fn().mockResolvedValue({ id: 'scan' }),
      },
      scanEquivalentFeedback: { create: jest.fn().mockImplementation(async ({ data }) => ({ ...data, id: 'report', createdAt: new Date() })) },
    };
    service = new ScansService(prisma, {} as any, { delete: jest.fn().mockResolvedValue(undefined) } as any);
  });
  test('a commercial can report a wrong equivalent without knowing a replacement', async () => {
    const result = await service.submitEquivalentFeedback('scan', 'user', 'commercial', { equivalentName: 'H 125 AL', vote: 'down' });
    expect(result.suggestedName).toBeNull();
    expect(prisma.scan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'scan', userId: 'user' } }));
  });
  test('keeps an optional suggested correction', async () => {
    const result = await service.submitEquivalentFeedback('scan', 'user', 'commercial', { equivalentName: 'H 125 AL', vote: 'down', suggestedName: ' USAGOL AL ' });
    expect(result.suggestedName).toBe('USAGOL AL');
  });
  test('rejects feedback about a product not actually proposed', async () => {
    await expect(service.submitEquivalentFeedback('scan', 'user', 'commercial', { equivalentName: 'MADE UP', vote: 'up' })).rejects.toThrow('proposed in this scan');
    expect(prisma.scanEquivalentFeedback.create).not.toHaveBeenCalled();
  });
  test('keeps distributor and ownership restrictions', async () => {
    await expect(service.submitEquivalentFeedback('scan', 'user', 'distributor', { equivalentName: 'H 125 AL', vote: 'down' })).rejects.toThrow('commerciaux');
    prisma.scan.findFirst.mockResolvedValue(null);
    await expect(service.submitEquivalentFeedback('scan', 'other', 'commercial', { equivalentName: 'H 125 AL', vote: 'down' })).rejects.toThrow('Scan not found');
  });
});

describe('Scan deletion', () => {
  let service: ScansService;
  let prisma: any;
  let storage: any;

  beforeEach(() => {
    prisma = {
      scan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'scan-1',
          photoKey: 'scans/user/photo.jpg',
          _count: { workflows: 0 },
        }),
        delete: jest.fn().mockResolvedValue({ id: 'scan-1' }),
      },
    };
    storage = { delete: jest.fn().mockResolvedValue(undefined) };
    service = new ScansService(prisma, {} as any, storage);
  });

  test('deletes only a scan owned by the current user and removes its photo', async () => {
    await expect(service.delete('scan-1', 'user-1')).resolves.toEqual({
      message: 'Scan deleted',
    });

    expect(prisma.scan.findFirst).toHaveBeenCalledWith({
      where: { id: 'scan-1', userId: 'user-1' },
      select: {
        id: true,
        photoKey: true,
        _count: { select: { workflows: true } },
      },
    });
    expect(prisma.scan.delete).toHaveBeenCalledWith({ where: { id: 'scan-1' } });
    expect(storage.delete).toHaveBeenCalledWith('scans/user/photo.jpg');
  });

  test('does not expose or delete another user scan', async () => {
    prisma.scan.findFirst.mockResolvedValue(null);

    await expect(service.delete('scan-1', 'other-user')).rejects.toThrow('Scan not found');
    expect(prisma.scan.delete).not.toHaveBeenCalled();
  });

  test('preserves scans linked to a submitted price request', async () => {
    prisma.scan.findFirst.mockResolvedValue({
      id: 'scan-1',
      photoKey: null,
      _count: { workflows: 1 },
    });

    await expect(service.delete('scan-1', 'user-1')).rejects.toThrow(
      'Scan is linked to a price request',
    );
    expect(prisma.scan.delete).not.toHaveBeenCalled();
  });

  test('keeps the deletion successful if photo cleanup fails', async () => {
    storage.delete.mockRejectedValue(new Error('MinIO unavailable'));

    await expect(service.delete('scan-1', 'user-1')).resolves.toEqual({
      message: 'Scan deleted',
    });
  });
});
