import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ScanStatus, ScanMethod } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ScanFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ScanStatus })
  @IsOptional()
  @IsEnum(ScanStatus)
  status?: ScanStatus;

  @ApiPropertyOptional({ enum: ScanMethod })
  @IsOptional()
  @IsEnum(ScanMethod)
  method?: ScanMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
