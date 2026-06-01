import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ApproveWorkflowDto, RejectWorkflowDto } from './dto/review-workflow.dto';
import { WorkflowStatus, NotificationType, UserRole, UserStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
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

  async create(userId: string, role: string, dto: CreateWorkflowDto) {
    // Seuls les distributeurs peuvent émettre une demande de prix.
    if (role !== UserRole.distributor) {
      throw new ForbiddenException(
        'Seuls les distributeurs peuvent émettre une demande de prix.',
      );
    }

    // Idempotency: a replayed offline sync must not create a duplicate
    // (ni renvoyer un second email).
    if (dto.clientRequestId) {
      const existing = await this.prisma.priceWorkflow.findUnique({
        where: { clientRequestId: dto.clientRequestId },
        include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
      });
      if (existing) return this.formatWorkflow(existing);
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { departments: { select: { id: true, name: true } } },
    });

    // The FK is optional: AI-identified equivalents are free-text names, not
    // catalog rows. Only resolve a MolydalProduct when an id is explicitly given.
    let productName = dto.productName ?? null;
    let molydalRef = dto.molydalRef ?? null;
    if (dto.molydalProductId) {
      const molydalProduct = await this.prisma.molydalProduct.findUniqueOrThrow({
        where: { id: dto.molydalProductId },
      });
      productName = productName ?? molydalProduct.name;
      molydalRef = molydalRef ?? molydalProduct.reference;
    }

    // Routage : commerciaux du/des département(s) du distributeur ; repli admins.
    const departmentIds = user.departments.map((d) => d.id);
    let recipients = departmentIds.length
      ? await this.prisma.user.findMany({
          where: {
            role: UserRole.commercial,
            status: UserStatus.approved,
            departments: { some: { id: { in: departmentIds } } },
          },
          select: { id: true, email: true },
        })
      : [];

    let routedToAdmins = false;
    if (recipients.length === 0) {
      routedToAdmins = true;
      recipients = await this.prisma.user.findMany({
        where: { role: UserRole.admin, status: UserStatus.approved },
        select: { id: true, email: true },
      });
    }

    const actorName = `${user.firstName} ${user.lastName}`;
    const now = new Date();

    const wf = await this.prisma.priceWorkflow.create({
      data: {
        clientRequestId: dto.clientRequestId,
        scanId: dto.scanId,
        molydalProductId: dto.molydalProductId ?? null,
        productName,
        molydalRef,
        clientName: dto.clientName ?? null,
        quantity: dto.quantity ?? null,
        unit: dto.unit || 'L',
        requestedPrice: dto.requestedPrice,
        status: WorkflowStatus.submitted,
        userId,
        routedDepartmentId: user.departments[0]?.id ?? null,
        routedToAdmins,
        recipients: { connect: recipients.map((r) => ({ id: r.id })) },
        steps: {
          create: [
            { status: WorkflowStatus.draft, actor: actorName, date: now },
            { status: WorkflowStatus.submitted, actor: actorName, date: now },
          ],
        },
      },
      include: { steps: { orderBy: { date: 'asc' } }, molydalProduct: true },
    });

    // Notifications best-effort : ne jamais faire échouer la demande.
    await this.notifyRecipients(wf.id, {
      recipients,
      distributor: user,
      product: { name: productName ?? '', ref: molydalRef ?? '' },
      quantity: dto.quantity ?? null,
      unit: dto.unit || 'L',
      clientName: dto.clientName ?? null,
      departmentName: user.departments[0]?.name ?? null,
      routedToAdmins,
    });

    return this.formatWorkflow(wf);
  }

  /**
   * Email aux destinataires + notification in-app. Best-effort : toute erreur
   * est journalisée mais ne fait pas échouer la création de la demande.
   */
  private async notifyRecipients(
    workflowId: string,
    ctx: {
      recipients: { id: string; email: string }[];
      distributor: { firstName: string; lastName: string; email: string };
      product: { name: string; ref: string };
      quantity?: number | null;
      unit: string;
      clientName?: string | null;
      departmentName?: string | null;
      routedToAdmins: boolean;
    },
  ): Promise<void> {
    const productLabel = ctx.product.name || ctx.product.ref || 'un produit';
    const distributorName =
      `${ctx.distributor.firstName} ${ctx.distributor.lastName}`.trim();

    try {
      await this.emailService.sendPriceRequestToCommercials({
        recipients: ctx.recipients.map((r) => r.email),
        distributor: ctx.distributor,
        product: ctx.product,
        quantity: ctx.quantity,
        unit: ctx.unit,
        clientName: ctx.clientName,
        departmentName: ctx.departmentName,
        isFallback: ctx.routedToAdmins,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(`Email demande de prix échoué (${workflowId}): ${message}`);
    }

    await Promise.all(
      ctx.recipients.map((r) =>
        this.notificationsService
          .create(
            r.id,
            NotificationType.workflow_update,
            'Nouvelle demande de prix',
            `${distributorName} demande un prix pour ${productLabel}.`,
            workflowId,
          )
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            this.logger.error(
              `Notification demande de prix échouée (${workflowId} → ${r.id}): ${message}`,
            );
          }),
      ),
    );
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
      `Votre demande de prix pour ${updated.productName || updated.molydalProduct?.name || 'le produit'} (${wf.clientName}) a été approuvée à ${dto.approvedPrice}€/${updated.unit}.`,
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
      `Votre demande pour ${updated.productName || updated.molydalProduct?.name || 'le produit'} (${wf.clientName}) a été refusée. Motif : ${dto.comment}`,
      id,
    );

    return this.formatWorkflow(updated);
  }

  private formatWorkflow(wf: any) {
    return {
      id: wf.id,
      scanId: wf.scanId,
      productName: wf.productName || wf.molydalProduct?.name || '',
      molydalRef: wf.molydalRef || wf.molydalProduct?.reference || '',
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
