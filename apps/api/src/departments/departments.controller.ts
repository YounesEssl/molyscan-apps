import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // Public : utilisé par l'écran d'inscription mobile (sélection du département
  // pour les distributeurs). Données non sensibles.
  @Get()
  @ApiOperation({ summary: 'List departments (public — registration picker)' })
  list() {
    return this.departmentsService.list();
  }
}
