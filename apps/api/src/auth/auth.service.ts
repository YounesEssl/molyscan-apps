import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, UserStatus, User } from '@prisma/client';
import { randomUUID } from 'crypto';

// Les adresses @molydal.com sont des commerciaux internes ; tout autre domaine
// correspond à un distributeur partenaire.
const MOLYDAL_DOMAIN = 'molydal.com';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.assertAccountApproved(user.status);

    return this.generateTokens(user.id, user.email, user.role);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Rôle déduit du domaine email (autorité serveur). Distributeur =
    // département choisi à l'inscription ; commercial = attribué par l'admin.
    const isMolydal = dto.email.trim().toLowerCase().endsWith(`@${MOLYDAL_DOMAIN}`);
    const role = isMolydal ? UserRole.commercial : UserRole.distributor;

    let departmentConnect: { connect: { id: string }[] } | undefined;
    if (!isMolydal) {
      if (!dto.departmentId) {
        throw new BadRequestException(
          'Le département est obligatoire pour une inscription distributeur.',
        );
      }
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new BadRequestException('Département introuvable.');
      }
      departmentConnect = { connect: [{ id: department.id }] };
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role,
        status: UserStatus.pending,
        ...(departmentConnect ? { departments: departmentConnect } : {}),
      },
    });

    // Notification admin (best-effort : ne jamais faire échouer l'inscription
    // si l'envoi d'email échoue — le compte est créé et reste en attente).
    await this.notifyAdminsOfAccessRequest(user);

    return {
      status: UserStatus.pending,
      message:
        'Votre demande a été enregistrée. Un administrateur doit valider votre compte avant que vous puissiez vous connecter.',
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    this.assertAccountApproved(stored.user.status);

    const accessToken = this.jwtService.sign({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    return { accessToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { departments: { select: { id: true, name: true } } },
    });
    // Token valide mais compte supprimé/inexistant → 401 (et non 500) pour que
    // le client purge sa session et redirige vers la connexion.
    if (!user) {
      throw new UnauthorizedException('Compte introuvable.');
    }
    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ─── Validation des comptes ────────────────────────────────────────────

  private assertAccountApproved(status: UserStatus): void {
    if (status === UserStatus.approved) return;

    if (status === UserStatus.pending) {
      throw new ForbiddenException(
        'Votre compte est en attente de validation par un administrateur.',
      );
    }

    throw new ForbiddenException(
      "Votre demande de création de compte n'a pas été acceptée.",
    );
  }

  private async notifyAdminsOfAccessRequest(user: User): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.admin, status: UserStatus.approved },
        select: { email: true },
      });
      const recipients = admins.map((a) => a.email);

      const base = this.configService
        .get<string>('ADMIN_WEB_URL', 'http://localhost:5173')
        .replace(/\/$/, '');
      const reviewUrl = `${base}/access-requests`;

      await this.emailService.sendAccessRequestToAdmins({
        applicant: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        reviewUrl,
        recipients,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(
        `Notification admin échouée pour ${user.email}: ${message}`,
      );
    }
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomUUID();
    const refreshExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    const expiresAt = new Date();
    const days = parseInt(refreshExpiration) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
