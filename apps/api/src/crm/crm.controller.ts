import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CrmService } from './crm.service';
import { SaveCrmCredentialsDto } from './dto/save-credentials.dto';

@ApiTags('CRM')
@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('canUpdateCRM')
@ApiBearerAuth()
export class CrmController {
  constructor(private crmService: CrmService) {}

  @Post('credentials')
  @ApiOperation({ summary: 'Save & verify the current user CRM credentials' })
  saveCredentials(@CurrentUser() user: JwtPayload, @Body() dto: SaveCrmCredentialsDto) {
    return this.crmService.saveCredentials(user.sub, dto.login, dto.password);
  }

  @Get('credentials/status')
  @ApiOperation({ summary: 'Whether the current user has CRM credentials configured' })
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.crmService.getStatus(user.sub);
  }

  @Delete('credentials')
  @ApiOperation({ summary: 'Remove the current user CRM credentials' })
  deleteCredentials(@CurrentUser() user: JwtPayload) {
    return this.crmService.deleteCredentials(user.sub);
  }

  @Get('companies')
  @ApiOperation({ summary: 'Search CRM companies (for the voice-note company picker)' })
  getCompanies(
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.crmService.searchCompanies(user.sub, q ?? '', parsedLimit);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Search CRM contacts for a selected company' })
  getContacts(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.crmService.searchContacts(user.sub, companyId, q ?? '', parsedLimit);
  }
}
