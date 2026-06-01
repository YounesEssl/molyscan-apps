import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Ventes Sud-Est' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
