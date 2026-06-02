import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateEquivalenceDto {
  @ApiProperty({ example: 'Molykote', description: 'Marque du concurrent' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  competitorBrand!: string;

  @ApiProperty({
    example: 'BR-2 Plus High Performance Grease',
    description: 'Nom du produit concurrent',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  competitorName!: string;

  @ApiProperty({ example: 'MO/3', description: 'Équivalent Molydal' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  molydalEquivalent!: string;

  @ApiPropertyOptional({ example: 'GRAISSES', description: 'Famille Molydal' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  molydalFamily?: string;

  @ApiPropertyOptional({ example: 100, description: 'Niveau de confiance (0-100)' })
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
