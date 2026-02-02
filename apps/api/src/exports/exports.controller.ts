import { Controller, Get, Post, Body, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ExportsService } from './exports.service';
import { ExportConfigDto } from './dto/export-config.dto';

@ApiTags('Exports')
@Controller('exports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('canExportData')
@ApiBearerAuth()
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Get()
  @ApiOperation({ summary: 'List user exports' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.exportsService.findAll(user.sub);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new export (async)' })
  generate(@CurrentUser() user: JwtPayload, @Body() dto: ExportConfigDto) {
    return this.exportsService.generate(user.sub, dto);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download an export file' })
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, format } = await this.exportsService.download(id, user.sub);

    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };

    res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }
}
