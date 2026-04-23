import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateFreeConversationDto {
  @ApiProperty({ required: false, maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;
}
