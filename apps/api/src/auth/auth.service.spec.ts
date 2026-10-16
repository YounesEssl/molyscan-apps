import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService session renewal', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const prisma = { refreshToken: {
    findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn(),
  } };
  const jwt = { sign: jest.fn() };
  const config = { get: jest.fn() };
  const service = new AuthService(prisma as any, jwt as any, config as any, {} as any);
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
