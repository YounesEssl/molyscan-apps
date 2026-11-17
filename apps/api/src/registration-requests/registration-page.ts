import { UserStatus } from '@prisma/client';
import type {
  RegistrationApplicantView,
  RegistrationRequestView,
} from './registration-approval.service';

/**
 * Rendu HTML autonome (sans app mobile ni console admin) de la page
 * d'acceptation d'une inscription. Le seul script, inline et protégé par un
 * nonce CSP, désactive les boutons au premier envoi (anti double clic) ; la
 * protection réelle contre le rejeu est faite côté serveur.
 */
export function renderRegistrationPage(
  view: RegistrationRequestView,
  opts: { nonce: string; action: string },
): string {
  switch (view.state) {
    case 'pending':
      return layout(
        'Demande d’inscription',
        `
        <h1>Demande d’<em>inscription</em></h1>
        <p>Ce client souhaite accéder à Molyscan. Son compte reste bloqué tant
        que la demande n’est pas acceptée.</p>
        ${applicantTable(view.applicant)}
        ${view.isFallback ? '<p class="muted">Aucun commercial n’est rattaché à ce département : la demande vous est transmise en repli.</p>' : ''}
        <div class="actions">
          <form method="post" action="${esc(opts.action)}" data-decision-form>
            <input type="hidden" name="decision" value="approve">
            <button type="submit" class="btn primary">Accepter l’inscription</button>
          </form>
          <form method="post" action="${esc(opts.action)}" data-decision-form data-confirm="Refuser définitivement cette inscription ?">
            <input type="hidden" name="decision" value="reject">
            <button type="submit" class="btn secondary">Refuser</button>
          </form>
        </div>
        <p class="muted">Lien valable jusqu’au ${esc(formatDate(view.expiresAt))}, utilisable une seule fois.</p>
        <script nonce="${esc(opts.nonce)}">
          (function () {
            var sent = false;
            document.querySelectorAll('[data-decision-form]').forEach(function (form) {
              form.addEventListener('submit', function (event) {
                var question = form.getAttribute('data-confirm');
                if (sent || (question && !window.confirm(question))) {
                  event.preventDefault();
                  return;
                }
                sent = true;
                document.querySelectorAll('[data-decision-form] button').forEach(function (b) {
                  b.disabled = true;
                });
                form.querySelector('button').textContent = 'Envoi en cours…';
              });
            });
          })();
        </script>`,
      );
    case 'decided':
      return layout(
        view.decision === 'approved' ? 'Inscription acceptée' : 'Inscription refusée',
        `
        <h1>Inscription <em>${view.decision === 'approved' ? 'acceptée' : 'refusée'}</em></h1>
        <p>${
          view.decision === 'approved'
            ? 'Le compte est activé : le client peut désormais se connecter à Molyscan. Il a été prévenu par email.'
            : 'La demande a été refusée. Le client a été prévenu par email.'
        }</p>
        ${applicantTable(view.applicant)}
        <p class="muted">Décision enregistrée le ${esc(formatDate(view.decidedAt))}. Ce lien n’est plus utilisable.</p>`,
      );
    case 'processed':
      return layout(
        'Demande déjà traitée',
        `
        <h1>Demande déjà <em>traitée</em></h1>
        <p>Cette inscription a déjà été traitée par un autre destinataire ou
        depuis la console d’administration. Statut actuel du compte :
        <strong>${esc(statusLabel(view.status))}</strong>.</p>
        ${applicantTable(view.applicant)}`,
      );
    case 'expired':
      return layout(
        'Lien expiré',
        `
        <h1>Lien <em>expiré</em></h1>
        <p>Ce lien d’approbation a expiré. La demande est toujours en attente :
        un administrateur peut la valider depuis la console d’administration.</p>
        ${applicantTable(view.applicant)}`,
      );
    case 'invalid':
    default:
      return layout(
        'Lien invalide',
        `
        <h1>Lien <em>invalide</em></h1>
        <p>Ce lien d’approbation est introuvable. Vérifiez que vous avez copié
        l’adresse complète depuis l’email reçu.</p>`,
      );
  }
}

function applicantTable(a: RegistrationApplicantView): string {
  const rows: [string, string | null][] = [
    ['Nom', `${a.firstName} ${a.lastName}`.trim()],
    ['Email', a.email],
    ['Société', a.company],
    ['Téléphone', a.phone],
    ['Département', a.departments.join(', ') || null],
    ['Demande du', formatDate(a.createdAt)],
  ];
  return `<table>${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v!)}</td></tr>`)
    .join('')}</table>`;
}

function statusLabel(status: UserStatus): string {
  switch (status) {
    case UserStatus.approved:
      return 'actif';
    case UserStatus.rejected:
      return 'refusé';
    case UserStatus.pending:
      return 'en attente';
    default:
      return String(status);
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Molyscan</title>
<style>
  :root { --paper:#f5f1ea; --card:#fffdf8; --ink:#1a1410; --ink2:#6f675c; --ink3:#9a9288; --red:#d4251c; --border:#efe7da; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  main { max-width:560px; margin:40px auto; padding:0 16px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:24px; padding:28px 32px 32px; }
  .brand { font-family:Georgia,'Times New Roman',serif; font-weight:bold; font-size:20px; padding-bottom:20px; border-bottom:1px solid var(--border); margin-bottom:24px; }
  .brand span, h1 em { color:var(--red); }
  h1 { font-family:Georgia,'Times New Roman',serif; font-weight:normal; font-size:27px; margin:0 0 16px; }
  h1 em { font-style:italic; }
  p { color:var(--ink2); line-height:1.6; font-size:15px; margin:0 0 14px; }
  table { width:100%; border-collapse:collapse; background:var(--paper); border-radius:14px; margin:20px 0; }
  th { text-align:left; padding:11px 16px; font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:var(--ink3); font-weight:normal; width:130px; vertical-align:top; }
  td { padding:11px 16px 11px 0; font-size:15px; font-weight:600; word-break:break-word; }
  .actions { display:flex; gap:12px; flex-wrap:wrap; margin:28px 0 8px; }
  .btn { border:0; border-radius:999px; padding:15px 30px; font-size:15px; font-weight:600; cursor:pointer; font-family:inherit; }
  .btn.primary { background:var(--red); color:#fff; }
  .btn.secondary { background:transparent; color:var(--ink); border:1px solid var(--border); }
  .btn:disabled { opacity:.55; cursor:default; }
  .muted { font-size:12px; color:var(--ink3); margin-top:20px; }
</style>
</head>
<body>
<main><div class="card">
<div class="brand">Moly<span>Scan</span></div>
${body}
</div></main>
</body>
</html>`;
}
