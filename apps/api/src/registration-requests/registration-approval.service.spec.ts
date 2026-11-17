import { UserRole, UserStatus } from '@prisma/client';
import {
  hashRegistrationToken,
  RegistrationApprovalService,
} from './registration-approval.service';
import { RegistrationRequestsController } from './registration-requests.controller';

const NOW = new Date('2026-11-17T10:00:00Z');
const TOKEN = 'A'.repeat(43);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    firstName: 'Claire',
    lastName: 'Martin',
    email: 'claire@client.fr',
    company: 'ACME',
    phone: null,
    status: UserStatus.pending,
    createdAt: new Date('2026-11-16T09:00:00Z'),
    departments: [{ id: 'dep-69', name: 'Rhône', code: '69' }],
    ...overrides,
  };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tok-1',
    tokenHash: hashRegistrationToken(TOKEN),
    userId: 'client-1',
    recipientEmail: 'paul@molydal.com',
    recipientUserId: 'com-1',
    isFallback: false,
    expiresAt: new Date(NOW.getTime() + 3_600_000),
    usedAt: null as Date | null,
    decision: null as string | null,
    user: makeUser(),
    ...overrides,
  };
}

describe('RegistrationApprovalService', () => {
  const prisma: any = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    registrationApprovalToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown => fn(prisma)),
  };
  const env: Record<string, string> = {};
  const config = {
    get: jest.fn((key: string, fallback?: string) => env[key] ?? fallback),
  };
  const email = {
    sendRegistrationApprovalRequest: jest.fn(),
    sendAccountApproved: jest.fn(),
    sendAccountRejected: jest.fn(),
  };
  const service = new RegistrationApprovalService(
    prisma as any,
    config as any,
    email as any,
  );

  const commercial = (id: string, mail: string, muted = false) => ({
    id,
    email: mail,
    departments: [{ emailNotificationsDisabled: muted }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    for (const k of Object.keys(env)) delete env[k];
    email.sendRegistrationApprovalRequest.mockResolvedValue(true);
    prisma.registrationApprovalToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      firstName: 'Claire',
      email: 'claire@client.fr',
    });
  });
  afterEach(() => jest.useRealTimers());

  // ─── Aiguillage ──────────────────────────────────────────────────────

  describe('resolveApprovers', () => {
    it('routes to the approved commercials of the applicant department, admins in cc', async () => {
      prisma.user.findMany
        .mockResolvedValueOnce([
          commercial('com-1', 'paul@molydal.com'),
          commercial('com-2', 'PAUL@molydal.com'), // doublon d'adresse
        ])
        .mockResolvedValueOnce([
          commercial('adm-1', 'admin@molydal.com'),
          commercial('adm-2', 'Paul@molydal.com'), // déjà destinataire
          commercial('adm-3', 'muet@molydal.com', true),
        ]);

      await expect(service.resolveApprovers(['dep-69'])).resolves.toEqual({
        recipients: [{ email: 'paul@molydal.com', userId: 'com-1' }],
        isFallback: false,
        cc: ['admin@molydal.com'],
      });
      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
        role: UserRole.commercial,
        status: UserStatus.approved,
        departments: { some: { id: { in: ['dep-69'] } } },
      });
    });

    it('falls back to admins when no (unmuted) commercial covers the department', async () => {
      prisma.user.findMany
        .mockResolvedValueOnce([commercial('com-1', 'muet@molydal.com', true)])
        .mockResolvedValueOnce([commercial('adm-1', 'admin@molydal.com')]);

      await expect(service.resolveApprovers(['dep-69'])).resolves.toEqual({
        recipients: [{ email: 'admin@molydal.com', userId: 'adm-1' }],
        isFallback: true,
        cc: [],
      });
      expect(prisma.user.findMany.mock.calls[1][0].where).toEqual({
        role: UserRole.admin,
        status: UserStatus.approved,
      });
    });

    it('falls back to REGISTRATION_FALLBACK_EMAIL when there is no admin either', async () => {
      env.REGISTRATION_FALLBACK_EMAIL = ' contact@molydal.com ';
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.resolveApprovers(['dep-69'])).resolves.toEqual({
        recipients: [{ email: 'contact@molydal.com', userId: null }],
        isFallback: true,
        cc: [],
      });
    });

    it('returns no recipient when nothing is configured', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await expect(service.resolveApprovers([])).resolves.toEqual({
        recipients: [],
        isFallback: true,
        cc: [],
      });
    });
  });

  // ─── Envoi ───────────────────────────────────────────────────────────

  describe('requestApproval', () => {
    it('stores only a hash and emails each recipient a personal link', async () => {
      env.API_PUBLIC_URL = 'https://api.molyscan.fr/';
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.user.findMany
        .mockResolvedValueOnce([
          commercial('com-1', 'paul@molydal.com'),
          commercial('com-2', 'lea@molydal.com'),
        ])
        .mockResolvedValueOnce([commercial('adm-1', 'admin@molydal.com')]);

      await expect(service.requestApproval('client-1')).resolves.toBe(2);

      expect(prisma.registrationApprovalToken.create).toHaveBeenCalledTimes(2);
      const sentUrls = email.sendRegistrationApprovalRequest.mock.calls.map(
        ([p]) => p.reviewUrl as string,
      );
      expect(new Set(sentUrls).size).toBe(2);
      sentUrls.forEach((url, i) => {
        const match = /^https:\/\/api\.molyscan\.fr\/api\/registration-requests\/([A-Za-z0-9_-]{43})$/.exec(url);
        expect(match).not.toBeNull();
        const stored = prisma.registrationApprovalToken.create.mock.calls[i][0].data;
        expect(stored.tokenHash).toBe(hashRegistrationToken(match![1]));
        expect(stored.tokenHash).not.toContain(match![1]);
        expect(stored.expiresAt).toEqual(new Date(NOW.getTime() + 168 * 3_600_000));
      });
      expect(email.sendRegistrationApprovalRequest.mock.calls[0][0]).toMatchObject({
        to: 'paul@molydal.com',
        cc: ['admin@molydal.com'],
        isFallback: false,
        applicant: { email: 'claire@client.fr', company: 'ACME', departments: ['69 — Rhône'] },
      });
    });

    it('never throws when the database or email provider fails', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      await expect(service.requestApproval('client-1')).resolves.toBe(0);
    });

    it('does nothing for an account that is no longer pending', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: UserStatus.approved }));
      await expect(service.requestApproval('client-1')).resolves.toBe(0);
      expect(prisma.registrationApprovalToken.create).not.toHaveBeenCalled();
    });
  });

  // ─── Validité du jeton ───────────────────────────────────────────────

  describe('getRequest', () => {
    it('shows a pending request for a valid token', async () => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(makeToken());
      const view = await service.getRequest(TOKEN);
      expect(view.state).toBe('pending');
      expect(prisma.registrationApprovalToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tokenHash: hashRegistrationToken(TOKEN) } }),
      );
    });

    it.each(['', 'short', `${TOKEN}x`, '../../etc/passwd', `${'A'.repeat(42)}/`])(
      'rejects malformed token %p without querying the database',
      async (bad) => {
        await expect(service.getRequest(bad)).resolves.toEqual({ state: 'invalid' });
        expect(prisma.registrationApprovalToken.findUnique).not.toHaveBeenCalled();
      },
    );

    it('rejects an unknown (wrong) token', async () => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(null);
      await expect(service.getRequest('B'.repeat(43))).resolves.toEqual({ state: 'invalid' });
    });

    it.each([0, -1])('reports an expired token (expiresAt = now %p ms)', async (delta) => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(
        makeToken({ expiresAt: new Date(NOW.getTime() + delta) }),
      );
      await expect(service.getRequest(TOKEN)).resolves.toMatchObject({ state: 'expired' });
    });

    it('reports the decision taken with an already used token', async () => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(
        makeToken({ usedAt: NOW, decision: 'approved', user: makeUser({ status: UserStatus.approved }) }),
      );
      await expect(service.getRequest(TOKEN)).resolves.toMatchObject({
        state: 'decided',
        decision: 'approved',
      });
    });

    it('reports a request already handled elsewhere (other recipient or admin console)', async () => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(
        makeToken({ user: makeUser({ status: UserStatus.rejected }) }),
      );
      await expect(service.getRequest(TOKEN)).resolves.toMatchObject({
        state: 'processed',
        status: UserStatus.rejected,
      });
    });
  });

  // ─── Décision ────────────────────────────────────────────────────────

  describe('decide', () => {
    it('approves the account atomically, invalidates sibling links and notifies the client', async () => {
      prisma.registrationApprovalToken.findUnique
        .mockResolvedValueOnce(makeToken()) // getRequest initial
        .mockResolvedValueOnce({ id: 'tok-1', userId: 'client-1' }) // dans la transaction
        .mockResolvedValueOnce(
          makeToken({ usedAt: NOW, decision: 'approved', user: makeUser({ status: UserStatus.approved }) }),
        );

      await expect(service.decide(TOKEN, 'approved')).resolves.toMatchObject({
        state: 'decided',
        decision: 'approved',
      });

      expect(prisma.registrationApprovalToken.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'tok-1', usedAt: null, expiresAt: { gt: NOW } },
        data: { usedAt: NOW, decision: 'approved' },
      });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'client-1', status: UserStatus.pending },
        data: { status: UserStatus.approved },
      });
      expect(prisma.registrationApprovalToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { userId: 'client-1', usedAt: null },
        data: { usedAt: NOW },
      });
      expect(email.sendAccountApproved).toHaveBeenCalledWith({
        firstName: 'Claire',
        email: 'claire@client.fr',
      });
      expect(email.sendAccountRejected).not.toHaveBeenCalled();
    });

    it('rejects the account and notifies the client', async () => {
      prisma.registrationApprovalToken.findUnique
        .mockResolvedValueOnce(makeToken())
        .mockResolvedValueOnce({ id: 'tok-1', userId: 'client-1' })
        .mockResolvedValueOnce(makeToken({ usedAt: NOW, decision: 'rejected' }));

      await service.decide(TOKEN, 'rejected');
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: UserStatus.rejected } }),
      );
      expect(email.sendAccountRejected).toHaveBeenCalled();
    });

    it.each([
      ['expired', makeToken({ expiresAt: new Date(NOW.getTime() - 1) })],
      ['used', makeToken({ usedAt: NOW, decision: 'rejected' })],
      ['processed', makeToken({ user: makeUser({ status: UserStatus.approved }) })],
    ])('does not change anything for a %s token (replay)', async (_label, record) => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(record);
      await service.decide(TOKEN, 'approved');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(email.sendAccountApproved).not.toHaveBeenCalled();
    });

    it('does not change anything for a wrong token', async () => {
      prisma.registrationApprovalToken.findUnique.mockResolvedValue(null);
      await expect(service.decide('C'.repeat(43), 'approved')).resolves.toEqual({ state: 'invalid' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('loses the race cleanly on a concurrent double click', async () => {
      prisma.registrationApprovalToken.findUnique
        .mockResolvedValueOnce(makeToken())
        .mockResolvedValueOnce({ id: 'tok-1', userId: 'client-1' })
        .mockResolvedValueOnce(makeToken({ usedAt: NOW, decision: 'approved' }));
      // L'autre requête a consommé le jeton entre la lecture et l'écriture.
      prisma.registrationApprovalToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.decide(TOKEN, 'rejected')).resolves.toMatchObject({
        state: 'decided',
        decision: 'approved',
      });
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(email.sendAccountRejected).not.toHaveBeenCalled();
    });

    it('rolls back when the account was approved elsewhere meanwhile', async () => {
      prisma.registrationApprovalToken.findUnique
        .mockResolvedValueOnce(makeToken())
        .mockResolvedValueOnce({ id: 'tok-1', userId: 'client-1' })
        .mockResolvedValueOnce(makeToken({ user: makeUser({ status: UserStatus.approved }) }));
      prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });

      await service.decide(TOKEN, 'rejected');
      // Le throw dans le callback fait annuler la transaction par Prisma.
      expect(prisma.registrationApprovalToken.updateMany).toHaveBeenCalledTimes(1);
      expect(email.sendAccountRejected).not.toHaveBeenCalled();
    });
  });
});

describe('RegistrationRequestsController', () => {
  const approvals = { getRequest: jest.fn(), decide: jest.fn() };
  const controller = new RegistrationRequestsController(approvals as any);
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.send = jest.fn(() => res);
    res.redirect = jest.fn(() => res);
    return res;
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the decision page with strict security headers and no side effect', async () => {
    approvals.getRequest.mockResolvedValue({
      state: 'pending',
      applicant: {
        firstName: '<script>x</script>', lastName: 'M', email: 'c@c.fr', company: null,
        phone: null, departments: ['69 — Rhône'], createdAt: NOW,
      },
      expiresAt: NOW,
      isFallback: false,
    });
    const res = makeRes();
    await controller.show(TOKEN, res);

    expect(approvals.decide).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const headers = res.set.mock.calls[0][0];
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Cache-Control']).toBe('no-store');
    const html: string = res.send.mock.calls[0][0];
    expect(html).toContain('value="approve"');
    expect(html).toContain('value="reject"');
    expect(html).not.toContain('<script>x</script>');
    const nonce = /script-src 'nonce-([^']+)'/.exec(headers['Content-Security-Policy'])![1];
    expect(html).toContain(`<script nonce="${nonce}">`);
  });

  it('applies the decision then redirects (303) back to the page', async () => {
    const res = makeRes();
    await controller.decide(TOKEN, 'approve', res);
    expect(approvals.decide).toHaveBeenCalledWith(TOKEN, 'approved');
    expect(res.redirect).toHaveBeenCalledWith(303, TOKEN);
  });

  it.each([undefined, 'APPROVE', 'toString', ['approve']])(
    'ignores an unknown decision %p',
    async (decision) => {
      const res = makeRes();
      await controller.decide(TOKEN, decision, res);
      expect(approvals.decide).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(303, TOKEN);
    },
  );

  it('never redirects to an attacker-controlled location', async () => {
    const res = makeRes();
    await controller.decide('\\\\evil.example', 'approve', res);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(approvals.decide).not.toHaveBeenCalled();
  });
});
