import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push/push.service';
import { NotificationType } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async findAll(userId: string, pagination: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        relatedId: n.relatedId,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    relatedId?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, relatedId },
    });

    // Send push notification
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.pushToken) {
      await this.pushService.sendPush(user.pushToken, title, body, {
        type,
        relatedId,
      });
    }

    return notification;
  }

  async registerPushToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
  }
}
