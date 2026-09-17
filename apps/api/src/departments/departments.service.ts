import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Liste publique destinée à l'inscription : les marqueurs administratifs,
  // comme « Divers », ne sont pas des zones géographiques sélectionnables.
  listPublic() {
    return this.prisma.department.findMany({
      where: { emailNotificationsDisabled: false },
      orderBy: { code: 'asc' },
    });
  }

  // Liste complète pour l'attribution des départements dans l'administration.
  listAll() {
    return this.prisma.department.findMany({ orderBy: { code: 'asc' } });
  }
}
