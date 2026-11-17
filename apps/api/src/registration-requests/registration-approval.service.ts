import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const DEFAULT_TTL_HOURS = 168; // 7 jours
// 32 octets aléatoires encodés en base64url = 43 caractères.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type RegistrationDecision = 'approved' | 'rejected';

export interface ApprovalRecipient {
  email: string;
  userId: string | null;
}

export interface ApprovalRouting {
  recipients: ApprovalRecipient[];
  // true = aucun commercial sur le(s) département(s) : repli admins / adresse.
  isFallback: boolean;
  // Admins en copie des emails envoyés aux commerciaux (vide en repli).
  cc: string[];
}

export interface RegistrationApplicantView {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  phone: string | null;
  departments: string[];
  createdAt: Date;
}

/**
 * États possibles d'un lien d'approbation, du point de vue de la page web :
 * - pending   : la demande peut être acceptée / refusée avec ce lien ;
 * - decided   : ce lien a servi à prendre la décision `decision` ;
 * - processed : la demande a été traitée ailleurs (autre commercial, console
 *               admin) — `status` donne le statut actuel du compte ;
 * - expired   : lien expiré alors que la demande est toujours en attente ;
 * - invalid   : jeton inconnu ou malformé.
 */
export type RegistrationRequestView =
  | {
      state: 'pending';
      applicant: RegistrationApplicantView;
      expiresAt: Date;
      isFallback: boolean;
    }
  | {
      state: 'decided';
      applicant: RegistrationApplicantView;
      decision: RegistrationDecision;
      decidedAt: Date;
    }
  | {
      state: 'processed';
      applicant: RegistrationApplicantView;
      status: UserStatus;
    }
  | { state: 'expired'; applicant: RegistrationApplicantView }
  | { state: 'invalid' };

class DecisionConflict extends Error {}

const APPLICANT_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      phone: true,
      status: true,
      createdAt: true,
      departments: { select: { name: true, code: true } },
    },
  },
} as const;

export function isWellFormedRegistrationToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function hashRegistrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RegistrationApprovalService {
  private readonly logger = new Logger(RegistrationApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Aiguillage ────────────────────────────────────────────────────────

  /**
   * Destinataires du lien d'approbation pour un demandeur rattaché à
   * `departmentIds` : commerciaux approuvés de ces départements, sinon les
   * admins approuvés, sinon `REGISTRATION_FALLBACK_EMAIL`. Un compte rattaché
   * à un département « notifications désactivées » (ex. Divers) ne reçoit
   * rien, comme pour les demandes de prix et les scans.
   */
  async resolveApprovers(departmentIds: string[]): Promise<ApprovalRouting> {
    const select = {
      id: true,
      email: true,
      departments: { select: { emailNotificationsDisabled: true } },
    } as const;

    const commercials = departmentIds.length
      ? await this.prisma.user.findMany({
          where: {
            role: UserRole.commercial,
            status: UserStatus.approved,
            departments: { some: { id: { in: departmentIds } } },
          },
          select,
        })
      : [];
    const assigned = dedupe(commercials.filter(notMuted));

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.admin, status: UserStatus.approved },
      select,
    });
    const activeAdmins = dedupe(admins.filter(notMuted));

    if (assigned.length) {
      // Les admins suivent toutes les inscriptions clients en copie.
      const assignedEmails = new Set(assigned.map((r) => r.email.toLowerCase()));
      const cc = activeAdmins
        .map((a) => a.email)
        .filter((email) => !assignedEmails.has(email.toLowerCase()));
      return { recipients: assigned, isFallback: false, cc };
    }

    if (activeAdmins.length) {
      return { recipients: activeAdmins, isFallback: true, cc: [] };
    }

    const fallbackEmail = this.configService
      .get<string>('REGISTRATION_FALLBACK_EMAIL', '')
      .trim();
    return {
      recipients: fallbackEmail ? [{ email: fallbackEmail, userId: null }] : [],
      isFallback: true,
      cc: [],
    };
  }

  /**
   * Envoie à chaque destinataire un lien d'approbation personnel. Best-effort :
   * ne lève jamais (l'inscription est déjà enregistrée) et renvoie le nombre
   * d'emails effectivement envoyés.
   */
  async requestApproval(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { departments: true },
      });
      if (!user || user.status !== UserStatus.pending) return 0;

      const routing = await this.resolveApprovers(
        user.departments.map((d) => d.id),
      );
      if (!routing.recipients.length) {
        this.logger.warn(
          `Aucun destinataire pour l'approbation de ${user.email} (ni commercial, ni admin, ni REGISTRATION_FALLBACK_EMAIL).`,
        );
        return 0;
      }

      const expiresAt = new Date(Date.now() + this.ttlHours() * 3_600_000);
      let sent = 0;
      for (const recipient of routing.recipients) {
        const token = randomBytes(32).toString('base64url');
        await this.prisma.registrationApprovalToken.create({
          data: {
            tokenHash: hashRegistrationToken(token),
            userId: user.id,
            recipientEmail: recipient.email,
            recipientUserId: recipient.userId,
            isFallback: routing.isFallback,
            expiresAt,
          },
        });
        const ok = await this.emailService.sendRegistrationApprovalRequest({
          to: recipient.email,
          cc: routing.cc,
          applicant: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            company: user.company,
            departments: user.departments.map(departmentLabel),
          },
          reviewUrl: this.reviewUrl(token),
          expiresAt,
          isFallback: routing.isFallback,
        });
        if (ok) sent++;
      }
      return sent;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(`Demande d'approbation échouée (${userId}): ${message}`);
      return 0;
    }
  }

  // ─── Page web ──────────────────────────────────────────────────────────

  async getRequest(token: string): Promise<RegistrationRequestView> {
    if (!TOKEN_PATTERN.test(token)) return { state: 'invalid' };

    const record = await this.prisma.registrationApprovalToken.findUnique({
      where: { tokenHash: hashRegistrationToken(token) },
      include: APPLICANT_INCLUDE,
    });
    if (!record) return { state: 'invalid' };

    const applicant = toApplicantView(record.user);
    if (record.usedAt && isDecision(record.decision)) {
      return {
        state: 'decided',
        applicant,
        decision: record.decision,
        decidedAt: record.usedAt,
      };
    }
    if (record.usedAt || record.user.status !== UserStatus.pending) {
      return { state: 'processed', applicant, status: record.user.status };
    }
    if (record.expiresAt <= new Date()) return { state: 'expired', applicant };

    return {
      state: 'pending',
      applicant,
      expiresAt: record.expiresAt,
      isFallback: record.isFallback,
    };
  }

  /**
   * Applique la décision de façon atomique : le jeton n'est consommé que s'il
   * est encore valide ET que le compte est encore en attente ; les autres
   * jetons du même demandeur sont invalidés dans la même transaction. Un
   * double clic ou un rejeu retombe donc sur l'état « decided » / « processed ».
   */
  async decide(
    token: string,
    decision: RegistrationDecision,
  ): Promise<RegistrationRequestView> {
    const current = await this.getRequest(token);
    if (current.state !== 'pending') return current;

    const now = new Date();
    const tokenHash = hashRegistrationToken(token);
    let applied: { userId: string; firstName: string; email: string } | null =
      null;

    try {
      applied = await this.prisma.$transaction(async (tx) => {
        const record = await tx.registrationApprovalToken.findUnique({
          where: { tokenHash },
          select: { id: true, userId: true },
        });
        if (!record) throw new DecisionConflict();

        const consumed = await tx.registrationApprovalToken.updateMany({
          where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now, decision },
        });
        if (consumed.count !== 1) throw new DecisionConflict();

        const updated = await tx.user.updateMany({
          where: { id: record.userId, status: UserStatus.pending },
          data: {
            status:
              decision === 'approved'
                ? UserStatus.approved
                : UserStatus.rejected,
          },
        });
        if (updated.count !== 1) throw new DecisionConflict();

        await tx.registrationApprovalToken.updateMany({
          where: { userId: record.userId, usedAt: null },
          data: { usedAt: now },
        });

        const user = await tx.user.findUniqueOrThrow({
          where: { id: record.userId },
          select: { firstName: true, email: true },
        });
        return { userId: record.userId, ...user };
      });
    } catch (err) {
      if (!(err instanceof DecisionConflict)) throw err;
    }

    if (applied) {
      this.logger.log(
        `Inscription ${applied.email} ${decision === 'approved' ? 'acceptée' : 'refusée'} via lien email.`,
      );
      await this.notifyApplicant(applied, decision);
    }
    return this.getRequest(token);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  reviewUrl(token: string): string {
    const port = this.configService.get<string>('PORT', '3000');
    const base = this.configService
      .get<string>('API_PUBLIC_URL', `http://localhost:${port}`)
      .replace(/\/+$/, '');
    const prefix = this.configService
      .get<string>('API_PREFIX', 'api')
      .replace(/^\/+|\/+$/g, '');
    return `${base}${prefix ? `/${prefix}` : ''}/registration-requests/${token}`;
  }

  private ttlHours(): number {
    const raw = Number(
      this.configService.get<string>('REGISTRATION_APPROVAL_TTL_HOURS'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_HOURS;
  }

  private async notifyApplicant(
    user: { firstName: string; email: string },
    decision: RegistrationDecision,
  ): Promise<void> {
    try {
      const payload = { firstName: user.firstName, email: user.email };
      if (decision === 'approved') {
        await this.emailService.sendAccountApproved(payload);
      } else {
        await this.emailService.sendAccountRejected(payload);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(`Email de décision échoué (${user.email}): ${message}`);
    }
  }
}

function notMuted(user: {
  departments: { emailNotificationsDisabled: boolean }[];
}): boolean {
  return user.departments.every((d) => !d.emailNotificationsDisabled);
}

function dedupe(users: { id: string; email: string }[]): ApprovalRecipient[] {
  const byEmail = new Map<string, ApprovalRecipient>();
  for (const u of users) {
    const key = u.email.trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, { email: u.email.trim(), userId: u.id });
  }
  return [...byEmail.values()];
}

function departmentLabel(d: { name: string; code: string | null }): string {
  return d.code ? `${d.code} — ${d.name}` : d.name;
}

function isDecision(value: string | null): value is RegistrationDecision {
  return value === 'approved' || value === 'rejected';
}

function toApplicantView(user: {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  phone: string | null;
  createdAt: Date;
  departments: { name: string; code: string | null }[];
}): RegistrationApplicantView {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    company: user.company,
    phone: user.phone,
    departments: user.departments.map(departmentLabel),
    createdAt: user.createdAt,
  };
}
