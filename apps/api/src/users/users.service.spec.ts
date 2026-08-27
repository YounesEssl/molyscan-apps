import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from './users.service';

describe('UsersService account deletion', () => {
  const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const deleteUser = jest.fn().mockResolvedValue({ id: 'user-1' });
  const transactionClient = {
    conversationSubmission: { deleteMany },
    scanEquivalentFeedback: { deleteMany },
    priceWorkflow: { deleteMany },
    aIConversation: { deleteMany },
    voiceNote: { deleteMany },
    notification: { deleteMany },
    exportRecord: { deleteMany },
    refreshToken: { deleteMany },
    passwordResetToken: { deleteMany },
    crmCredential: { deleteMany },
    scan: { deleteMany },
    user: { delete: deleteUser },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    scan: { findMany: jest.fn() },
    voiceNote: { findMany: jest.fn() },
    exportRecord: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(transactionClient)),
  };
  const storage = { delete: jest.fn() };
  const service = new UsersService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 0 });
    deleteUser.mockResolvedValue({ id: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.scan.findMany.mockResolvedValue([{ photoKey: 'scans/photo.jpg' }]);
    prisma.voiceNote.findMany.mockResolvedValue([{ audioKey: 'voice/audio.m4a' }]);
    prisma.exportRecord.findMany.mockResolvedValue([{ fileKey: 'exports/report.pdf' }]);
    storage.delete.mockResolvedValue(undefined);
  });

  it('deletes the database account before removing stored files', async () => {
    await expect(service.deleteAccount('user-1')).resolves.toEqual({
      message: 'Account deleted',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(storage.delete).toHaveBeenCalledTimes(3);
    expect(storage.delete).toHaveBeenCalledWith('scans/photo.jpg');
    expect(storage.delete).toHaveBeenCalledWith('voice/audio.m4a');
    expect(storage.delete).toHaveBeenCalledWith('exports/report.pdf');
  });
});
