import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEquivalenceDto {
  @ApiProperty({ example: 'Molykote', description: 'Marque du concurrent' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  competitorBrand!: string;

  @ApiProperty({
    example: 'BR-2 Plus High Performance Grease',
    description: 'Nom du produit concurrent',
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(200)
  competitorName!: string;

  @ApiPropertyOptional({
    example: 'MO/3',
    description: 'Requis sauf si aucun équivalent',
  })
  @ValidateIf((dto: CreateEquivalenceDto) => dto.noEquivalent !== true)
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(200)
  molydalEquivalent?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Absence d’équivalent confirmée par un expert',
  })
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsBoolean()
  noEquivalent?: boolean;

  @ApiPropertyOptional({ example: 'GRAISSES', description: 'Famille Molydal' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  molydalFamily?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Niveau de confiance (0-100)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Note interne' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
