import { ScansService } from './scans.service';

describe('Scan feedback', () => {
  let service: ScansService;
  let prisma: any;
  beforeEach(() => {
    prisma = {
      scan: { findFirst: jest.fn().mockResolvedValue({ id: 'scan', molydalEquivalent: 'H 125 AL', equivalentsJson: [] }) },
      scanEquivalentFeedback: { create: jest.fn().mockImplementation(async ({ data }) => ({ ...data, id: 'report', createdAt: new Date() })) },
    };
    service = new ScansService(prisma, {} as any, {} as any);
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
