import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'crypto';
import {
  isWellFormedRegistrationToken,
  RegistrationApprovalService,
  RegistrationDecision,
} from './registration-approval.service';
import { renderRegistrationPage } from './registration-page';

const DECISIONS = new Map<string, RegistrationDecision>([
  ['approve', 'approved'],
  ['reject', 'rejected'],
]);

/**
 * Page web publique (authentifiée par le jeton du lien email) permettant au
 * commercial d'accepter / refuser une inscription sans passer par l'app.
 *
 * - GET n'a aucun effet de bord (les scanners de liens des messageries
 *   pré-chargent les URLs) ;
 * - POST applique la décision puis redirige (303) vers le GET, pour qu'un
 *   rafraîchissement ne renvoie pas le formulaire.
 */
@ApiExcludeController()
@Controller('registration-requests')
export class RegistrationRequestsController {
  constructor(private readonly approvals: RegistrationApprovalService) {}

  @Get(':token')
  async show(@Param('token') token: string, @Res() res: Response) {
    const view = await this.approvals.getRequest(token);
    const nonce = randomBytes(16).toString('base64');
    this.sendHtml(
      res,
      view.state === 'invalid' ? 404 : 200,
      renderRegistrationPage(view, { nonce, action: encodeURIComponent(token) }),
      nonce,
    );
  }

  @Post(':token')
  async decide(
    @Param('token') token: string,
    @Body('decision') decision: unknown,
    @Res() res: Response,
  ) {
    if (!isWellFormedRegistrationToken(token)) {
      // Jamais de redirection construite à partir d'une entrée non validée.
      const nonce = randomBytes(16).toString('base64');
      const html = renderRegistrationPage({ state: 'invalid' }, { nonce, action: '' });
      return this.sendHtml(res, 404, html, nonce);
    }
    const mapped =
      typeof decision === 'string' ? DECISIONS.get(decision) : undefined;
    if (mapped) await this.approvals.decide(token, mapped);
    // Décision inconnue : on réaffiche simplement la page.
    res.redirect(303, encodeURIComponent(token));
  }

  private sendHtml(res: Response, status: number, html: string, nonce: string) {
    res
      .status(status)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // Le jeton est dans l'URL : ne jamais le transmettre en Referer.
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': [
          "default-src 'none'",
          "style-src 'unsafe-inline'",
          `script-src 'nonce-${nonce}'`,
          "form-action 'self'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
        ].join('; '),
      })
      .send(html);
  }
}
