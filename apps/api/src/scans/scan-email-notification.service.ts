import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompletedScanPayload, EmailService } from '../email/email.service';

const REST_OF_WORLD = 'reste du monde';
const DELIVERY_WINDOW_MS = 23 * 60 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
type StoredPayload = Omit<CompletedScanPayload, 'scannedAt'> & { scannedAt: string };
type ScanNotificationRecord = {
  id: string;
  scannedAt: Date;
  identifiedName: string | null;
  identifiedBrand: string | null;
  molydalEquivalent: string | null;
  analysisText: string | null;
  equivalentsJson: unknown;
  user: {
    email: string; firstName: string; lastName: string; company: string | null;
    role: UserRole;
    departments: Array<{ id: string; name: string; emailNotificationsDisabled: boolean }>;
  };
};

/** Delivers new scan results to the Molydal team covering the client's department. */
@Injectable()
export class ScanEmailNotificationService {
  private readonly logger = new Logger(ScanEmailNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // A failed or interrupted send is retried. Historical scans are excluded by
  // scanEmailPending=false, which is also the migration default.
  @Cron('* * * * *')
  async retryPendingEmails(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.scan.findMany({
      where: {
        scanEmailPending: true,
        createdAt: { gte: new Date(now.getTime() - DELIVERY_WINDOW_MS) },
        OR: [
          { scanEmailNextAttemptAt: null },
          { scanEmailNextAttemptAt: { lte: now } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });

    for (const scan of due) {
      try {
        await this.notifyCompletedScan(scan.id);
      } catch (error) {
        this.logger.error(`Relance du mail du scan ${scan.id} échouée: ${error}`);
      }
    }
  }

  @Cron('0 8 * * *', { timeZone: 'Europe/Paris' })
  async reportExpiredEmails(): Promise<void> {
    const count = await this.prisma.scan.count({
      where: {
        scanEmailPending: true,
        createdAt: { lt: new Date(Date.now() - DELIVERY_WINDOW_MS) },
      },
    });
    if (count > 0) {
      this.logger.error(`${count} notification(s) de scan non envoyée(s) après 23 h ; intervention nécessaire.`);
    }
  }

  async notifyCompletedScan(scanId: string): Promise<void> {
    const now = new Date();
    // Atomically claim the scan: the request and cron (or two API instances)
    // must not submit the same email concurrently.
    const claim = await this.prisma.scan.updateMany({
      where: {
        id: scanId,
        scanEmailPending: true,
        createdAt: { gte: new Date(now.getTime() - DELIVERY_WINDOW_MS) },
        OR: [
          { scanEmailNextAttemptAt: null },
          { scanEmailNextAttemptAt: { lte: now } },
        ],
      },
      data: {
        scanEmailNextAttemptAt: new Date(now.getTime() + LEASE_MS),
        scanEmailAttemptCount: { increment: 1 },
      },
    });
    if (claim.count === 0) return;

    let attemptCount = 1;
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        select: {
          id: true,
          scannedAt: true,
          identifiedName: true,
          identifiedBrand: true,
          molydalEquivalent: true,
          analysisText: true,
          equivalentsJson: true,
          scanEmailPayload: true,
          scanEmailAttemptCount: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              company: true,
              role: true,
              departments: {
                select: { id: true, name: true, emailNotificationsDisabled: true },
              },
            },
          },
        },
      });
      if (!scan) return;
      attemptCount = scan.scanEmailAttemptCount;

      let payload: CompletedScanPayload | null;
      if (scan.scanEmailPayload) {
        const stored = scan.scanEmailPayload as unknown as StoredPayload;
        payload = { ...stored, scannedAt: new Date(stored.scannedAt) };
      } else {
        payload = await this.buildPayload(scan);
        if (!payload) {
          await this.prisma.scan.update({
            where: { id: scanId },
            data: { scanEmailPending: false, scanEmailNextAttemptAt: null },
          });
          return;
        }
        // Freeze recipients and content before the first provider request. A
        // retry uses the same payload with Resend's scan-specific idempotency key.
        const stored: StoredPayload = { ...payload, scannedAt: payload.scannedAt.toISOString() };
        await this.prisma.scan.update({
          where: { id: scanId },
          data: { scanEmailPayload: stored as unknown as Prisma.InputJsonValue },
        });
      }

      const sent = await this.email.sendCompletedScanToCommercials(payload);
      if (sent) {
        await this.prisma.scan.update({
          where: { id: scanId },
          data: {
            scanEmailPending: false,
            scanEmailSentAt: new Date(),
            scanEmailNextAttemptAt: null,
          },
        });
      } else {
        await this.scheduleRetry(scanId, attemptCount);
      }
    } catch (error) {
      // If even scheduling fails, the claim lease expires and the cron retries.
      try { await this.scheduleRetry(scanId, attemptCount); } catch { /* lease handles this */ }
      throw error;
    }
  }

  private async buildPayload(record: ScanNotificationRecord): Promise<CompletedScanPayload | null> {
    if (record.user.role !== UserRole.distributor) return null;
    // Guillaume handles this zone directly and does not want scan emails for it.
    if (record.user.departments.some((department) =>
      department.name.trim().toLocaleLowerCase('fr-FR') === REST_OF_WORLD,
    )) return null;

    const departments = record.user.departments.filter(
      (department) => !department.emailNotificationsDisabled,
    );
    if (departments.length === 0) return null;

    const recipients = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.commercial, UserRole.admin] },
        status: UserStatus.approved,
        departments: { some: { id: { in: departments.map((department) => department.id) } } },
      },
      select: {
        email: true,
        departments: { select: { emailNotificationsDisabled: true } },
      },
    });

    const emails = [...new Map(
      recipients
        .filter((recipient) => recipient.departments.every(
          (department) => !department.emailNotificationsDisabled,
        ))
        .map((recipient) => [recipient.email.trim().toLowerCase(), recipient.email.trim()]),
    ).values()];
    if (emails.length === 0) {
      this.logger.warn(`Aucun commercial destinataire pour le scan ${record.id}.`);
      return null;
    }

    const equivalents = Array.isArray(record.equivalentsJson)
      ? record.equivalentsJson.flatMap((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
          const name = 'name' in entry ? entry.name : null;
          const reason = 'reason' in entry ? entry.reason : null;
          const compatibility = 'compatibility' in entry ? entry.compatibility : null;
          if (typeof name !== 'string' || !name.trim()) return [];
          return [{
            name: name.trim(),
            reason: typeof reason === 'string' ? reason : null,
            compatibility: typeof compatibility === 'number' && Number.isFinite(compatibility)
              ? compatibility : null,
          }];
        })
      : [];

    return {
      scanId: record.id,
      scannedAt: record.scannedAt,
      recipients: emails,
      distributor: {
        firstName: record.user.firstName,
        lastName: record.user.lastName,
        email: record.user.email,
        company: record.user.company,
      },
      departments: departments.map((department) => department.name),
      identifiedName: record.identifiedName,
      identifiedBrand: record.identifiedBrand,
      equivalents,
      molydalEquivalent: record.molydalEquivalent,
      analysis: record.analysisText,
    } satisfies CompletedScanPayload;
  }

  private async scheduleRetry(scanId: string, attempts: number): Promise<void> {
    const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(attempts, 6));
    await this.prisma.scan.updateMany({
      // A concurrent attempt may have succeeded while this one was waiting.
      where: { id: scanId, scanEmailPending: true },
      data: { scanEmailNextAttemptAt: new Date(Date.now() + backoffMs) },
    });
  }
}
