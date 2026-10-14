import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, IsOptional, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(0)
  @MaxLength(1000)
  text!: string;

  @ApiPropertyOptional({ description: 'ID returned by POST /chat/attachments' })
  @IsString()
  @IsOptional()
  attachmentId?: string;

  @ApiPropertyOptional({ description: 'Preferred language for PIM document links' })
  @IsIn(['fr', 'en', 'es', 'de', 'it'])
  @IsOptional()
  documentLanguage?: string;
}
