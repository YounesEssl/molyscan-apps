import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  scanId!: string;

  @ApiProperty()
  @IsString()
  molydalProductId!: string;

  @ApiProperty()
  @IsString()
  clientName!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ default: 'L' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requestedPrice?: number;
}
