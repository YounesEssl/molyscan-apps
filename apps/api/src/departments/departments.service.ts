import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tri par code (NULLS LAST en Postgres pour l'ASC → zones export en fin).
  list() {
    return this.prisma.department.findMany({ orderBy: { code: 'asc' } });
  }
}
