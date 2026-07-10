import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateVoiceNoteDto {
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
