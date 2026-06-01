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

export interface PasswordResetPayload {
  firstName?: string | null;
  email: string;
  code: string;
  expiresMinutes: number;
}

export interface PriceRequestPayload {
  recipients: string[];
  distributor: { firstName: string; lastName: string; email: string };
  product: { name: string; ref: string };
  quantity?: number | null;
  unit: string;
  clientName?: string | null;
  departmentName?: string | null;
  // true = aucun commercial sur le département, repli sur les admins.
  isFallback: boolean;
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

  /** Envoie le code de réinitialisation de mot de passe (6 chiffres). */
  async sendPasswordResetCode(payload: PasswordResetPayload): Promise<void> {
    await this.send({
      to: [payload.email],
      subject: `Votre code de réinitialisation MolyScan — ${payload.code}`,
      html: this.renderPasswordResetEmail(payload),
      context: `password-reset:${payload.email}`,
    });
  }

  /**
   * Notifie le(s) commercial(aux) du département d'un distributeur qu'une
   * demande de prix a été émise. L'email invite simplement à recontacter le
   * distributeur pour le produit Molydal demandé.
   */
  async sendPriceRequestToCommercials(
    payload: PriceRequestPayload,
  ): Promise<void> {
    if (payload.recipients.length === 0) {
      this.logger.warn(
        `Aucun destinataire pour la demande de prix de ${payload.distributor.email}.`,
      );
      return;
    }

    const fullName =
      `${payload.distributor.firstName} ${payload.distributor.lastName}`.trim();
    const product = payload.product.name || payload.product.ref || 'un produit';

    await this.send({
      to: payload.recipients,
      subject: `Demande de prix — ${fullName} (${product})`,
      html: this.renderPriceRequestEmail(payload, fullName, product),
      context: `price-request:${payload.distributor.email}`,
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
      <h1 style="${H1}">Nouvelle demande d'${accent('accès')}</h1>
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

  private renderPriceRequestEmail(
    payload: PriceRequestPayload,
    fullName: string,
    product: string,
  ): string {
    const { distributor, quantity, unit, clientName, departmentName } = payload;
    const hasQty = quantity != null && Number.isFinite(quantity);

    const fallbackNote = payload.isFallback
      ? `<p style="${MUTED}">Aucun commercial n'est rattaché à ce département : cette demande vous est transmise en tant qu'administrateur, à router manuellement.</p>`
      : '';

    return wrapLayout(`
      <h1 style="${H1}">Nouvelle demande de ${accent('prix')}</h1>
      <p style="${P}">
        <strong>${escapeHtml(fullName)}</strong> (distributeur) souhaite obtenir
        un prix pour le produit Molydal ci-dessous. Merci de le recontacter
        directement à <a href="mailto:${escapeHtml(distributor.email)}">${escapeHtml(distributor.email)}</a>.
      </p>
      <table role="presentation" style="${TABLE}">
        ${row('Distributeur', escapeHtml(fullName))}
        ${row('Email', escapeHtml(distributor.email))}
        ${row('Produit', escapeHtml(product))}
        ${payload.product.ref ? row('Référence', escapeHtml(payload.product.ref)) : ''}
        ${hasQty ? row('Quantité', `${quantity} ${escapeHtml(unit)}`) : ''}
        ${clientName ? row('Client final', escapeHtml(clientName)) : ''}
        ${departmentName ? row('Département', escapeHtml(departmentName)) : ''}
      </table>
      ${fallbackNote}
    `);
  }

  private renderPasswordResetEmail(payload: PasswordResetPayload): string {
    const greeting = payload.firstName
      ? `Bonjour ${escapeHtml(payload.firstName)},`
      : 'Bonjour,';

    return wrapLayout(`
      <h1 style="${H1}">Réinitialisation du ${accent('mot de passe')}</h1>
      <p style="${P}">${greeting}</p>
      <p style="${P}">
        Voici votre code de réinitialisation. Saisissez-le dans l'application
        MolyScan pour choisir un nouveau mot de passe.
      </p>
      <div style="margin:24px 0;padding:22px;background:${RED_SOFT};border-radius:16px;text-align:center;">
        <span style="font-family:${SERIF};font-size:38px;font-weight:bold;letter-spacing:10px;color:${RED};">${escapeHtml(payload.code)}</span>
      </div>
      <p style="${P}">
        Ce code expire dans <strong>${payload.expiresMinutes} minutes</strong>.
      </p>
      <p style="${MUTED}">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email :
        votre mot de passe reste inchangé.
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
        <h1 style="${H1}">Compte ${accent('approuvé')}</h1>
        <p style="${P}">${greeting}</p>
        <p style="${P}">
          Votre demande d'accès à <strong>MolyScan</strong> a été approuvée.
          Vous pouvez désormais vous connecter à l'application avec votre email
          et le mot de passe choisis lors de l'inscription.
        </p>
      `);
    }

    return wrapLayout(`
      <h1 style="${H1}">Demande ${accent('non retenue')}</h1>
      <p style="${P}">${greeting}</p>
      <p style="${P}">
        Votre demande d'accès à <strong>MolyScan</strong> n'a pas été retenue.
        Pour toute question, rapprochez-vous de votre administrateur Molydal.
      </p>
    `);
  }
}

// ─── Styles & helpers de rendu (inline, compatibilité clients mail) ──────────
// Direction artistique calquée sur l'app : papier crème, encre chaude, rouge
// Molydal, serif éditorial (Georgia ≈ Fraunces) pour les titres, sans pour le
// corps. Pas de gradient/webfont (rendu incohérent sur Outlook/Gmail) — rouge
// plein + pill bulletproof.

const PAPER = '#f5f1ea';
const CARD = '#fffdf8';
const INK = '#1a1410';
const INK_2 = '#6f675c';
const INK_3 = '#9a9288';
const RED = '#d4251c';
const RED_SOFT = '#fbeceb';
const BORDER = '#efe7da';

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const H1 = `margin:0 0 16px;font-size:27px;line-height:1.18;color:${INK};font-family:${SERIF};font-weight:normal;letter-spacing:-0.2px;`;
const P = `margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK_2};font-family:${SANS};`;
const MUTED = `margin:24px 0 0;font-size:12px;line-height:1.5;color:${INK_3};font-family:${SANS};`;
const TABLE = `width:100%;border-collapse:collapse;margin:20px 0 8px;background:${PAPER};border-radius:14px;`;
const BTN_PRIMARY = `display:inline-block;background:${RED};color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:999px;font-size:15px;font-weight:600;font-family:${SANS};`;

/** Accent rouge en italique serif — signature visuelle de l'app. */
const ACCENT = `color:${RED};font-family:${SERIF};font-style:italic;`;
function accent(text: string): string {
  return `<span style="${ACCENT}">${text}</span>`;
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:11px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:${INK_3};font-family:${SANS};width:130px;vertical-align:top;">${label}</td>
      <td style="padding:11px 16px 11px 0;font-size:15px;color:${INK};font-family:${SANS};font-weight:600;">${value}</td>
    </tr>`;
}

function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:${PAPER};">
    <table role="presentation" width="100%" style="background:${PAPER};padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="540" style="max-width:540px;width:100%;background:${CARD};border-radius:24px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="padding:26px 32px 0 32px;">
                <span style="font-size:20px;font-weight:bold;color:${INK};font-family:${SERIF};letter-spacing:-0.3px;">Moly<span style="color:${RED};">Scan</span></span>
                <div style="height:1px;background:${BORDER};margin:22px 0 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 34px 32px;">
                ${content}
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:${INK_3};font-family:${SANS};letter-spacing:0.4px;">Molydal · MolyScan</p>
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
