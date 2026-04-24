import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  base64!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mediaType!: string;
}
