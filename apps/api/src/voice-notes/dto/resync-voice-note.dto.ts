import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ResyncVoiceNoteDto {
  @ApiPropertyOptional({ description: 'Révision exacte à envoyer au CRM' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedRevision?: number;
}
