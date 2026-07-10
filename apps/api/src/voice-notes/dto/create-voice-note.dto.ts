import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateVoiceNoteDto {
  @ApiProperty()
  @IsNumber()
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
