import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RagSyncTrigger } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PimSyncService } from './pim-sync.service';

@ApiTags('Admin - PIM RAG')
@ApiBearerAuth()
@Controller('admin/rag')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PimAdminController {
  constructor(private readonly sync: PimSyncService) {}
  @Get('status') status() { return this.sync.status(); }
  @Post('sync')
  @ApiOperation({ summary: 'Queue a Sellbase PIM synchronization and a blue/green RAG rebuild' })
  syncNow(@CurrentUser('email') email: string) { return this.sync.requestSync(RagSyncTrigger.manual, email); }
}
