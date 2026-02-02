import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanFiltersDto } from './dto/scan-filters.dto';

@ApiTags('Scans')
@Controller('scans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScansController {
  constructor(private scansService: ScansService) {}

  @Get()
  @ApiOperation({ summary: 'List user scans with filters' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ScanFiltersDto) {
    return this.scansService.findAll(user.sub, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scan' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateScanDto) {
    return this.scansService.create(user.sub, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple scans (offline sync)' })
  createBatch(@CurrentUser() user: JwtPayload, @Body() dtos: CreateScanDto[]) {
    return this.scansService.createBatch(user.sub, dtos);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scan details' })
  findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scansService.findById(id, user.sub);
  }
}
