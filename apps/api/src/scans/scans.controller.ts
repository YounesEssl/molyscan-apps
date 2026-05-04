import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ScansService } from './scans.service';
import { ImageAnalysisService } from './image-analysis.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { ScanFiltersDto } from './dto/scan-filters.dto';
import { EquivalentFeedbackDto } from './dto/equivalent-feedback.dto';

@ApiTags('Scans')
@Controller('scans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScansController {
  constructor(
    private scansService: ScansService,
    private imageAnalysisService: ImageAnalysisService,
  ) {}

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

  @Post('analyze-image')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Analyze a product image and find Molydal equivalent' })
  analyzeImage(@CurrentUser() user: JwtPayload, @Body() dto: AnalyzeImageDto) {
    return this.imageAnalysisService.analyzeImage(
      dto.image,
      dto.mimeType,
      user.sub,
      dto.message,
      { lat: dto.locationLat, lng: dto.locationLng, label: dto.locationLabel },
    );
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

  @Post(':id/equivalent-feedback')
  @ApiOperation({ summary: 'Submit user feedback on a proposed Molydal equivalent' })
  submitEquivalentFeedback(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EquivalentFeedbackDto,
  ) {
    return this.scansService.submitEquivalentFeedback(id, user.sub, dto);
  }
}
