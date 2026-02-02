import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ScanMethod } from '@prisma/client';

export class CreateScanDto {
  @ApiProperty({ example: '3456789012345' })
  @IsString()
  barcode!: string;

  @ApiPropertyOptional({ enum: ScanMethod, default: ScanMethod.barcode })
  @IsOptional()
  @IsEnum(ScanMethod)
  scanMethod?: ScanMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationLabel?: string;
}
