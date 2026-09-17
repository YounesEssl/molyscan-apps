import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsInt, Min, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { decodeObjectiveCodes } from './crm-objectives';

export class UpdateVoiceNoteDto {
  @ApiProperty({ description: 'Révision lue à l’ouverture de la note' })
  @IsInt()
  @Min(0)
  expectedRevision!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transcription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  meetingAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  meetingEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  crmActionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  crmObjectiveCode?: string;

  @ApiPropertyOptional({ description: 'Objectifs sélectionnés ; [] pour effacer la sélection', type: [String] })
  @Transform(({ value }) => decodeObjectiveCodes(value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  crmObjectiveCodes?: string[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productMentioned?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
