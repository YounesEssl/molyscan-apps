import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updatePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [scans, voiceNotes, exports] = await Promise.all([
      this.prisma.scan.findMany({
        where: { userId },
        select: { photoKey: true },
      }),
      this.prisma.voiceNote.findMany({
        where: { OR: [{ userId }, { scan: { userId } }] },
        select: { audioKey: true },
      }),
      this.prisma.exportRecord.findMany({
        where: { userId },
        select: { fileKey: true },
      }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationSubmission.deleteMany({
        where: { OR: [{ userId }, { conversation: { userId } }] },
      });
      await tx.scanEquivalentFeedback.deleteMany({
        where: { OR: [{ userId }, { scan: { userId } }] },
      });
      await tx.priceWorkflow.deleteMany({
        where: { OR: [{ userId }, { scan: { userId } }] },
      });
      await tx.aIConversation.deleteMany({
        where: { OR: [{ userId }, { scan: { userId } }] },
      });
      await tx.voiceNote.deleteMany({
        where: { OR: [{ userId }, { scan: { userId } }] },
      });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.exportRecord.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.crmCredential.deleteMany({ where: { userId } });
      await tx.scan.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    const storageKeys = [
      ...scans.map((scan) => scan.photoKey),
      ...voiceNotes.map((note) => note.audioKey),
      ...exports.map((record) => record.fileKey),
    ].filter((key): key is string => Boolean(key));

    const cleanupResults = await Promise.allSettled(
      [...new Set(storageKeys)].map((key) => this.storage.delete(key)),
    );
    const cleanupFailureCount = cleanupResults.filter(
      (result) => result.status === 'rejected',
    ).length;
    if (cleanupFailureCount > 0) {
      this.logger.warn(
        `Account deleted, but ${cleanupFailureCount} stored file(s) could not be removed`,
      );
    }

    return { message: 'Account deleted' };
  }
}
