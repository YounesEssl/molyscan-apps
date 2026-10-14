import { UserRole, UserStatus } from '@prisma/client';
import { ScanEmailNotificationService } from './scan-email-notification.service';

describe('ScanEmailNotificationService', () => {
  const scan = {
    id: 'scan-1',
    scannedAt: new Date('2026-10-12T10:00:00Z'),
    identifiedName: 'AGL 65 AL',
    identifiedBrand: 'Concurrent',
    molydalEquivalent: 'AL SI 55',
    analysisText: 'AL SI 55 convient pour cette application.',
    equivalentsJson: [{ name: 'AL SI 55', compatibility: 91, reason: 'Application compatible' }],
    scanEmailAttemptCount: 1,
    scanEmailPayload: null,
    user: {
      firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com',
      company: 'SEFI', role: UserRole.distributor,
      departments: [{ id: '07', name: 'Ardèche', emailNotificationsDisabled: false }],
    },
  };

  let prisma: any;
  let email: any;
  let service: ScanEmailNotificationService;

  beforeEach(() => {
    prisma = {
      scan: {
        findUnique: jest.fn().mockResolvedValue(scan),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findMany: jest.fn().mockResolvedValue([
        { email: 'one@molydal.com', departments: [{ emailNotificationsDisabled: false }] },
        { email: 'two@molydal.com', departments: [{ emailNotificationsDisabled: false }] },
      ]) },
    };
    email = { sendCompletedScanToCommercials: jest.fn().mockResolvedValue(true) };
    service = new ScanEmailNotificationService(prisma, email);
  });

  it('emails every approved Molydal sector owner in the distributor department with the saved answer', async () => {
    await service.notifyCompletedScan('scan-1');

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: [UserRole.commercial, UserRole.admin] },
        status: UserStatus.approved,
        departments: { some: { id: { in: ['07'] } } },
      },
      select: expect.any(Object),
    });
    expect(email.sendCompletedScanToCommercials).toHaveBeenCalledWith(expect.objectContaining({
      scanId: 'scan-1',
      recipients: ['one@molydal.com', 'two@molydal.com'],
      identifiedName: 'AGL 65 AL',
      analysis: 'AL SI 55 convient pour cette application.',
      equivalents: [{ name: 'AL SI 55', compatibility: 91, reason: 'Application compatible' }],
    }));
    expect(prisma.scan.update).toHaveBeenCalledWith({
      where: { id: 'scan-1' },
      data: expect.objectContaining({ scanEmailPending: false, scanEmailSentAt: expect.any(Date) }),
    });
  });

  it('includes an administrator only when that person is assigned to the distributor sector', async () => {
    prisma.user.findMany.mockResolvedValue([
      { email: 'owner@molydal.com', departments: [{ emailNotificationsDisabled: false }] },
    ]);
    await service.notifyCompletedScan('scan-1');
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        role: { in: [UserRole.commercial, UserRole.admin] },
        departments: { some: { id: { in: ['07'] } } },
      }),
    }));
    expect(email.sendCompletedScanToCommercials).toHaveBeenCalledWith(expect.objectContaining({
      recipients: ['owner@molydal.com'],
    }));
  });

  it('never emails scans from the Reste du monde zone', async () => {
    prisma.scan.findUnique.mockResolvedValue({
      ...scan,
      user: { ...scan.user, departments: [
        { id: 'world', name: 'Reste du monde', emailNotificationsDisabled: false },
        ...scan.user.departments,
      ] },
    });
    await service.notifyCompletedScan('scan-1');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(email.sendCompletedScanToCommercials).not.toHaveBeenCalled();
    expect(prisma.scan.update).toHaveBeenCalledWith({
      where: { id: 'scan-1' },
      data: { scanEmailPending: false, scanEmailNextAttemptAt: null },
    });
  });

  it('does not notify anyone for a Molydal employee scan', async () => {
    prisma.scan.findUnique.mockResolvedValue({
      ...scan, user: { ...scan.user, role: UserRole.commercial },
    });
    await service.notifyCompletedScan('scan-1');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('respects opt-out departments and never falls back to unassigned admins', async () => {
    prisma.user.findMany.mockResolvedValue([
      { email: 'optout@molydal.com', departments: [
        { emailNotificationsDisabled: false }, { emailNotificationsDisabled: true },
      ] },
    ]);
    await service.notifyCompletedScan('scan-1');
    expect(email.sendCompletedScanToCommercials).not.toHaveBeenCalled();
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed delivery pending and retries the identical saved payload', async () => {
    email.sendCompletedScanToCommercials.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await service.notifyCompletedScan('scan-1');
    const snapshot = prisma.scan.update.mock.calls[0][0].data.scanEmailPayload;
    expect(snapshot.recipients).toEqual(['one@molydal.com', 'two@molydal.com']);
    expect(prisma.scan.updateMany).toHaveBeenCalledWith({
      where: { id: 'scan-1', scanEmailPending: true },
      data: { scanEmailNextAttemptAt: expect.any(Date) },
    });

    prisma.scan.findUnique.mockResolvedValue({ ...scan, scanEmailPayload: snapshot, scanEmailAttemptCount: 2 });
    await service.notifyCompletedScan('scan-1');
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(email.sendCompletedScanToCommercials).toHaveBeenCalledTimes(2);
    expect(email.sendCompletedScanToCommercials.mock.calls[1][0]).toEqual(
      email.sendCompletedScanToCommercials.mock.calls[0][0],
    );
  });

  it('does not claim a scan already being sent or already completed', async () => {
    prisma.scan.updateMany.mockResolvedValue({ count: 0 });
    await service.notifyCompletedScan('scan-1');
    expect(prisma.scan.findUnique).not.toHaveBeenCalled();
    expect(email.sendCompletedScanToCommercials).not.toHaveBeenCalled();
  });

  it('the retry worker only selects new scans that opted into email delivery', async () => {
    prisma.scan.findMany.mockResolvedValue([{ id: 'scan-1' }]);
    await service.retryPendingEmails();
    expect(prisma.scan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ scanEmailPending: true, createdAt: { gte: expect.any(Date) } }),
    }));
    expect(email.sendCompletedScanToCommercials).toHaveBeenCalledTimes(1);
  });
});
