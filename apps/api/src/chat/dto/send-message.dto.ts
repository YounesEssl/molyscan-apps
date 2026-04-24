import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, MinLength } from 'class-validator';

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
}
