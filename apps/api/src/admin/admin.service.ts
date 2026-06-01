import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { DepartmentsService } from '../departments/departments.service';
import { UpdateUserDto } from './dto/update-user.dto';

const ACCESS_REQUEST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  departments: { select: { id: true, name: true, code: true } },
} satisfies Prisma.UserSelect;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  company: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  departments: { select: { id: true, name: true, code: true } },
  _count: { select: { scans: true, workflows: true } },
} satisfies Prisma.UserSelect;

const isUserStatus = (v: string): v is UserStatus =>
  (Object.values(UserStatus) as string[]).includes(v);
const isUserRole = (v: string): v is UserRole =>
  (Object.values(UserRole) as string[]).includes(v);

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  // ─── Départements ──────────────────────────────────────────────────────

  listDepartments() {
    return this.departmentsService.list();
  }

  async createDepartment(name: string) {
    const trimmed = name.trim();
    try {
      return await this.prisma.department.create({ data: { name: trimmed } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Ce département existe déjà.');
      }
      throw err;
    }
  }

  // ─── Demandes d'accès ──────────────────────────────────────────────────

  listAccessRequests() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.pending },
      select: ACCESS_REQUEST_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveAccessRequest(userId: string, departmentIds: string[]) {
    const user = await this.findPendingUser(userId);
    await this.assertDepartmentsExist(departmentIds);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.approved,
        departments: { set: departmentIds.map((id) => ({ id })) },
      },
      select: ACCESS_REQUEST_SELECT,
    });

    await this.safeSendEmail(
      () =>
        this.emailService.sendAccountApproved({
          firstName: user.firstName,
          email: user.email,
        }),
      `approve-notify:${user.email}`,
    );

    return updated;
  }

  async rejectAccessRequest(userId: string) {
    const user = await this.findPendingUser(userId);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.rejected },
      select: ACCESS_REQUEST_SELECT,
    });

    await this.safeSendEmail(
      () =>
        this.emailService.sendAccountRejected({
          firstName: user.firstName,
          email: user.email,
        }),
      `reject-notify:${user.email}`,
    );

    return updated;
  }

  // ─── Utilisateurs ──────────────────────────────────────────────────────

  listUsers(params: { search?: string; status?: string; role?: string }) {
    const where: Prisma.UserWhereInput = {};

    if (params.status && isUserStatus(params.status)) {
      where.status = params.status;
    }
    if (params.role && isUserRole(params.role)) {
      where.role = params.role;
    }

    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(adminId: string, userId: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');

    // Garde-fou : un admin ne peut pas se rétrograder ni se suspendre lui-même.
    if (adminId === userId) {
      const demotesSelf = dto.role !== undefined && dto.role !== UserRole.admin;
      const suspendsSelf =
        dto.status !== undefined && dto.status !== UserStatus.approved;
      if (demotesSelf || suspendsSelf) {
        throw new BadRequestException(
          'Vous ne pouvez pas modifier votre propre rôle ou statut.',
        );
      }
    }

    if (dto.departmentIds) await this.assertDepartmentsExist(dto.departmentIds);

    const data: Prisma.UserUpdateInput = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.departmentIds !== undefined) {
      data.departments = { set: dto.departmentIds.map((id) => ({ id })) };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });

    // Notifier l'utilisateur sur une transition de statut.
    if (dto.status !== undefined && dto.status !== target.status) {
      if (dto.status === UserStatus.approved) {
        await this.safeSendEmail(
          () =>
            this.emailService.sendAccountApproved({
              firstName: target.firstName,
              email: target.email,
            }),
          `update-approve:${target.email}`,
        );
      } else if (dto.status === UserStatus.rejected) {
        await this.safeSendEmail(
          () =>
            this.emailService.sendAccountRejected({
              firstName: target.firstName,
              email: target.email,
            }),
          `update-reject:${target.email}`,
        );
      }
    }

    return updated;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async findPendingUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Demande introuvable.');
    if (user.status !== UserStatus.pending) {
      throw new BadRequestException(
        'Cette demande a déjà été traitée.',
      );
    }
    return user;
  }

  private async assertDepartmentsExist(departmentIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(departmentIds)];
    const count = await this.prisma.department.count({
      where: { id: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        'Un ou plusieurs départements sélectionnés sont introuvables.',
      );
    }
  }

  private async safeSendEmail(
    fn: () => Promise<void>,
    context: string,
  ): Promise<void> {
    try {
      await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(`Email échoué (${context}): ${message}`);
    }
  }
}
