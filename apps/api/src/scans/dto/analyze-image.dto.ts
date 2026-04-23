import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class AnalyzeImageDto {
  @ApiProperty({ description: 'Base64 encoded image data' })
  @IsString()
  image!: string;

  @ApiProperty({ description: 'MIME type (image/jpeg, image/png, etc.)' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ required: false, description: 'Optional user message/context' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  locationLng?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  locationLabel?: string;
}
