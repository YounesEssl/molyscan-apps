import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConversationProductDto {
  @ApiProperty()
  @IsString()
  scannedName!: string;

  @ApiProperty()
  @IsString()
  scannedBrand!: string;

  @ApiProperty()
  @IsString()
  molydalName!: string;

  @ApiProperty()
  @IsString()
  molydalReference!: string;
}

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  scanId!: string;

  @ApiProperty({ type: ConversationProductDto })
  @ValidateNested()
  @Type(() => ConversationProductDto)
  product!: ConversationProductDto;
}
