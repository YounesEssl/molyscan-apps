import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateWorkflowDto {
  @ApiPropertyOptional({ description: 'Idempotency key from the mobile offline outbox' })
  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @ApiProperty()
  @IsString()
  scanId!: string;

  @ApiPropertyOptional({ description: 'Molydal equivalent name (AI-identified or catalog)' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Molydal equivalent reference' })
  @IsOptional()
  @IsString()
  molydalRef?: string;

  @ApiPropertyOptional({ description: 'Optional catalog FK when the equivalent maps to a MolydalProduct' })
  @IsOptional()
  @IsString()
  molydalProductId?: string;

  // Optionnels : la demande de prix distributeur se fait sans formulaire.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ default: 'L' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requestedPrice?: number;
}
