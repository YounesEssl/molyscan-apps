import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface AccessRequestRecipient {
  email: string;
  firstName?: string | null;
}

export interface AccessRequestPayload {
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewUrl: string;
  recipients: string[];
}

export interface AccountDecisionPayload {
  firstName: string;
  email: string;
}

/**
 * Wrapper autour de Resend pour l'envoi d'emails transactionnels.
 *
 * Dégradation gracieuse (cf. PushService) : si `RESEND_API_KEY` n'est pas
 * configurée, le service journalise un avertissement et devient un no-op —
 * l'API démarre et fonctionne sans bloquer les flux qui dépendent de l'email.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'onboarding@resend.dev',
    );

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY absente — les emails ne seront pas envoyés (no-op).',
      );
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  get isConfigured(): boolean {
    return this.resend !== null;
  }

  /**
   * Notifie les administrateurs d'une nouvelle demande de création de compte,
   * avec deux liens magiques (approuver / refuser).
   */
  async sendAccessRequestToAdmins(payload: AccessRequestPayload): Promise<void> {
    if (payload.recipients.length === 0) {
      this.logger.warn(
        `Aucun administrateur destinataire pour la demande d'accès de ${payload.applicant.email}.`,
      );
      return;
    }

    const fullName =
      `${payload.applicant.firstName} ${payload.applicant.lastName}`.trim();
    const subject = `Nouvelle demande d'accès MolyScan — ${fullName}`;
    const html = this.renderAccessRequestEmail(payload, fullName);

    await this.send({
      to: payload.recipients,
      subject,
      html,
      context: `access-request:${payload.applicant.email}`,
    });
  }

  /** Informe l'utilisateur que son compte a été approuvé. */
  async sendAccountApproved(payload: AccountDecisionPayload): Promise<void> {
    await this.send({
      to: [payload.email],
      subject: 'Votre compte MolyScan a été approuvé',
      html: this.renderDecisionEmail({
        firstName: payload.firstName,
        approved: true,
      }),
      context: `account-approved:${payload.email}`,
    });
  }

  /** Informe l'utilisateur que sa demande a été refusée. */
  async sendAccountRejected(payload: AccountDecisionPayload): Promise<void> {
    await this.send({
      to: [payload.email],
      subject: 'Votre demande de compte MolyScan',
      html: this.renderDecisionEmail({
        firstName: payload.firstName,
        approved: false,
      }),
      context: `account-rejected:${payload.email}`,
    });
  }

  private async send(params: {
    to: string[];
    subject: string;
    html: string;
    context: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Email non envoyé (Resend non configuré) — ${params.context}`,
      );
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        this.logger.error(
          `Échec d'envoi Resend (${params.context}): ${error.name} — ${error.message}`,
        );
        return;
      }

      this.logger.log(`Email envoyé (${params.context}) → ${params.to.join(', ')}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(`Exception d'envoi Resend (${params.context}): ${message}`);
    }
  }

  private renderAccessRequestEmail(
    payload: AccessRequestPayload,
    fullName: string,
  ): string {
    const { applicant, reviewUrl } = payload;

    return wrapLayout(`
      <h1 style="${H1}">Nouvelle demande d'accès</h1>
      <p style="${P}">
        Un utilisateur souhaite créer un compte sur <strong>MolyScan</strong>.
        Ouvrez la console d'administration pour vérifier la demande, lui
        attribuer un ou plusieurs départements, puis l'approuver ou la refuser.
      </p>
      <table role="presentation" style="${TABLE}">
        ${row('Nom', escapeHtml(fullName))}
        ${row('Email', escapeHtml(applicant.email))}
      </table>
      <div style="margin:32px 0 8px;">
        <a href="${reviewUrl}" style="${BTN_PRIMARY}">Examiner la demande</a>
      </div>
      <p style="${MUTED}">
        Si vous n'attendiez pas cette demande, vous pouvez la refuser depuis la
        console d'administration.
      </p>
    `);
  }

  private renderDecisionEmail(params: {
    firstName: string;
    approved: boolean;
  }): string {
    const greeting = `Bonjour ${escapeHtml(params.firstName) || ''},`.trim();

    if (params.approved) {
      return wrapLayout(`
        <h1 style="${H1}">Compte approuvé ✅</h1>
        <p style="${P}">${greeting}</p>
        <p style="${P}">
          Votre demande d'accès à <strong>MolyScan</strong> a été approuvée.
          Vous pouvez désormais vous connecter à l'application avec votre email
          et le mot de passe choisis lors de l'inscription.
        </p>
      `);
    }

    return wrapLayout(`
      <h1 style="${H1}">Demande non retenue</h1>
      <p style="${P}">${greeting}</p>
      <p style="${P}">
        Votre demande d'accès à <strong>MolyScan</strong> n'a pas été retenue.
        Pour toute question, rapprochez-vous de votre administrateur Molydal.
      </p>
    `);
  }
}

// ─── Styles & helpers de rendu (inline, compatibilité clients mail) ──────────

const BRAND = '#1B3A5C';

const H1 = `margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND};font-family:Helvetica,Arial,sans-serif;`;
const P = `margin:0 0 14px;font-size:15px;line-height:1.55;color:#1a1410;font-family:Helvetica,Arial,sans-serif;`;
const MUTED = `margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a8178;font-family:Helvetica,Arial,sans-serif;`;
const TABLE = `width:100%;border-collapse:collapse;margin:8px 0 8px;`;
const BTN_PRIMARY = `display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-size:15px;font-weight:600;font-family:Helvetica,Arial,sans-serif;`;

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#8a8178;font-family:Helvetica,Arial,sans-serif;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:15px;color:#1a1410;font-family:Helvetica,Arial,sans-serif;font-weight:600;">${value}</td>
    </tr>`;
}

function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f1ea;">
    <table role="presentation" width="100%" style="background:#f5f1ea;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" style="max-width:520px;width:100%;background:#fffdf8;border-radius:16px;overflow:hidden;border:1px solid #ece5da;">
            <tr>
              <td style="background:${BRAND};padding:20px 28px;">
                <span style="font-size:18px;font-weight:700;color:#ffffff;font-family:Helvetica,Arial,sans-serif;letter-spacing:0.5px;">MolyScan</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${content}
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:11px;color:#b5aca0;font-family:Helvetica,Arial,sans-serif;">Molydal · MolyScan</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
