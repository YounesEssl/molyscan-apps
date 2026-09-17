import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, MaxLength, Min, IsArray, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { decodeObjectiveCodes } from './crm-objectives';

export class CreateVoiceNoteDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  duration!: number;

  @ApiPropertyOptional({ description: 'Transcription déjà obtenue côté mobile (éditable)' })
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

  @ApiPropertyOptional({ description: 'GUID du contact CRM (sélecteur contact)' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Date/heure du rendez-vous à synchroniser dans le CRM' })
  @IsOptional()
  @IsDateString()
  meetingAt?: string;

  @ApiPropertyOptional({ description: 'Fin du rendez-vous (ISO 8601 avec fuseau)' })
  @IsOptional()
  @IsDateString()
  meetingEndAt?: string;

  @ApiPropertyOptional({ description: 'Code action fourni par le référentiel CRM' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  crmActionCode?: string;

  @ApiPropertyOptional({ description: 'Code objectif fourni par le référentiel CRM' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  crmObjectiveCode?: string;

  @ApiPropertyOptional({ description: 'Codes du référentiel CRM ; transmis dans comm_liste_objectifs', type: [String] })
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

  @ApiPropertyOptional({ description: 'GUID de la société CRM (sélecteur société)' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedScanId?: string;
}
