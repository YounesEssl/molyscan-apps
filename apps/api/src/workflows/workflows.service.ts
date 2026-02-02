import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ApproveWorkflowDto, RejectWorkflowDto } from './dto/review-workflow.dto';
import { WorkflowStatus, NotificationType } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(userId: string, role: string, pagination: PaginationQueryDto, status?: WorkflowStatus) {
    const where: Record<string, unknown> = {};
    if (role !== 'admin') where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.priceWorkflow.findMany({
        where,
        include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.priceWorkflow.count({ where }),
    ]);

    return {
      data: data.map((wf) => this.formatWorkflow(wf)),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findById(id: string, userId: string, role: string) {
    const wf = await this.prisma.priceWorkflow.findUnique({
      where: { id },
      include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true, user: true },
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    if (role !== 'admin' && wf.userId !== userId) throw new ForbiddenException();
    return this.formatWorkflow(wf);
  }

  async create(userId: string, dto: CreateWorkflowDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const molydalProduct = await this.prisma.molydalProduct.findUniqueOrThrow({
      where: { id: dto.molydalProductId },
    });

    const actorName = `${user.firstName} ${user.lastName}`;
    const now = new Date();

    const wf = await this.prisma.priceWorkflow.create({
      data: {
        scanId: dto.scanId,
        molydalProductId: dto.molydalProductId,
        clientName: dto.clientName,
        quantity: dto.quantity,
        unit: dto.unit || 'L',
        requestedPrice: dto.requestedPrice,
        status: WorkflowStatus.submitted,
        userId,
        steps: {
          create: [
            { status: WorkflowStatus.draft, actor: actorName, date: now },
            { status: WorkflowStatus.submitted, actor: actorName, date: now },
          ],
        },
      },
      include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
    });

    return this.formatWorkflow(wf);
  }

  async approve(id: string, reviewerId: string, dto: ApproveWorkflowDto) {
    const wf = await this.prisma.priceWorkflow.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });

    if (wf.status !== WorkflowStatus.under_review && wf.status !== WorkflowStatus.submitted) {
      throw new BadRequestException('Workflow cannot be approved in current state');
    }

    const reviewer = await this.prisma.user.findUniqueOrThrow({ where: { id: reviewerId } });
    const actorName = `${reviewer.firstName} ${reviewer.lastName}`;

    const updated = await this.prisma.priceWorkflow.update({
      where: { id },
      data: {
        status: WorkflowStatus.approved,
        approvedPrice: dto.approvedPrice,
        reviewedById: reviewerId,
        reviewComment: dto.comment,
        steps: {
          create: {
            status: WorkflowStatus.approved,
            actor: actorName,
            comment: dto.comment,
          },
        },
      },
      include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
    });

    await this.notificationsService.create(
      wf.userId,
      NotificationType.price_approved,
      'Prix validé',
      `Votre demande de prix pour ${updated.molydalProduct.name} (${wf.clientName}) a été approuvée à ${dto.approvedPrice}€/${updated.unit}.`,
      id,
    );

    return this.formatWorkflow(updated);
  }

  async reject(id: string, reviewerId: string, dto: RejectWorkflowDto) {
    const wf = await this.prisma.priceWorkflow.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });

    if (wf.status !== WorkflowStatus.under_review && wf.status !== WorkflowStatus.submitted) {
      throw new BadRequestException('Workflow cannot be rejected in current state');
    }

    const reviewer = await this.prisma.user.findUniqueOrThrow({ where: { id: reviewerId } });
    const actorName = `${reviewer.firstName} ${reviewer.lastName}`;

    const updated = await this.prisma.priceWorkflow.update({
      where: { id },
      data: {
        status: WorkflowStatus.rejected,
        reviewedById: reviewerId,
        reviewComment: dto.comment,
        steps: {
          create: {
            status: WorkflowStatus.rejected,
            actor: actorName,
            comment: dto.comment,
          },
        },
      },
      include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
    });

    await this.notificationsService.create(
      wf.userId,
      NotificationType.price_rejected,
      'Prix refusé',
      `Votre demande pour ${updated.molydalProduct.name} (${wf.clientName}) a été refusée. Motif : ${dto.comment}`,
      id,
    );

    return this.formatWorkflow(updated);
  }

  private formatWorkflow(wf: any) {
    return {
      id: wf.id,
      scanId: wf.scanId,
      productName: wf.molydalProduct?.name || '',
      molydalRef: wf.molydalProduct?.reference || '',
      clientName: wf.clientName,
      quantity: wf.quantity,
      unit: wf.unit,
      requestedPrice: wf.requestedPrice,
      approvedPrice: wf.approvedPrice,
      status: wf.status,
      steps: wf.steps.map((s: any) => ({
        status: s.status,
        date: s.date.toISOString(),
        actor: s.actor,
        comment: s.comment,
      })),
      createdAt: wf.createdAt.toISOString(),
      updatedAt: wf.updatedAt.toISOString(),
    };
  }
}
