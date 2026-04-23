import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConversationHistoryItem {
  @ApiProperty()
  @IsString()
  role!: string;

  @ApiProperty()
  @IsString()
  content!: string;
}

export class FreeChatDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiProperty({ type: [ConversationHistoryItem], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConversationHistoryItem)
  conversationHistory?: ConversationHistoryItem[];
}
