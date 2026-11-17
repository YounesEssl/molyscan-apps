import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService session renewal', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const prisma = { refreshToken: {
    findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn(),
  } };
  const jwt = { sign: jest.fn() };
  const config = { get: jest.fn() };
  const service = new AuthService(prisma as any, jwt as any, config as any, {} as any, {} as any);
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    config.get.mockReturnValue('7d');
    jwt.sign.mockReturnValue('access');
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'session-1', expiresAt: new Date('2026-10-16T12:01:00Z'),
      user: { id: 'user-1', email: 'test@example.com', role: 'commercial', status: 'approved' },
    });
  });
  afterEach(() => jest.useRealTimers());
  it('extends a valid session by seven days from its last renewal', async () => {
    await expect(service.refresh('refresh')).resolves.toEqual({ accessToken: 'access' });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', expiresAt: { gt: now } },
      data: { expiresAt: new Date('2026-10-23T12:00:00Z') },
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'test@example.com', role: 'commercial' });
  });
  it('does not resurrect a session revoked concurrently by logout or password reset', async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.refresh('refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
  it.each([new Date(now.getTime() - 1), now])('rejects expired sessions, including the exact expiration instant', async (expiresAt) => {
    const session = await prisma.refreshToken.findUnique();
    prisma.refreshToken.findUnique.mockResolvedValue({ ...session, expiresAt });
    await expect(service.refresh('refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { id: 'session-1' } });
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
  it('rejects unknown sessions', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(service.refresh('refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
  it.each(['pending', 'rejected'])('does not renew %s accounts', async (status) => {
    const session = await prisma.refreshToken.findUnique();
    prisma.refreshToken.findUnique.mockResolvedValue({ ...session, user: { ...session.user, status } });
    await expect(service.refresh('refresh')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
  it.each([['12h', 12 * 3600000], ['30m', 30 * 60000], ['7d', 7 * 86400000], ['invalid', 7 * 86400000]])('honors the configured inactivity window %s', async (duration, milliseconds) => {
    config.get.mockReturnValue(duration);
    await service.refresh('refresh');
    expect(prisma.refreshToken.updateMany.mock.calls[0][0].data.expiresAt.getTime()).toBe(now.getTime() + milliseconds);
  });
});

describe('AuthService registration routing', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    department: { findUnique: jest.fn() },
  };
  const config = { get: jest.fn((_k: string, fallback?: string) => fallback) };
  const email = { sendAccessRequestToAdmins: jest.fn() };
  const approvals = { requestApproval: jest.fn() };
  const service = new AuthService(prisma as any, {} as any, config as any, email as any, approvals as any);
  const base = { password: 'secret1', firstName: 'Claire', lastName: 'Martin' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([{ email: 'admin@molydal.com' }]);
    prisma.user.create.mockImplementation(({ data }) => ({ id: 'new-user', ...data }));
  });

  it('sends a client registration to the commercial of the chosen department', async () => {
    prisma.department.findUnique.mockResolvedValue({ id: 'dep-69', emailNotificationsDisabled: false });
    const result = await service.register({ ...base, email: 'claire@client.fr', departmentId: 'dep-69' });
    expect(approvals.requestApproval).toHaveBeenCalledWith('new-user');
    expect(email.sendAccessRequestToAdmins).not.toHaveBeenCalled();
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      status: 'pending', role: 'distributor', departments: { connect: [{ id: 'dep-69' }] },
    });
    expect(result.message).toContain('commercial');
  });

  it('keeps the admin console flow for internal @molydal.com accounts', async () => {
    await service.register({ ...base, email: 'paul@molydal.com' });
    expect(email.sendAccessRequestToAdmins).toHaveBeenCalled();
    expect(approvals.requestApproval).not.toHaveBeenCalled();
  });
});
