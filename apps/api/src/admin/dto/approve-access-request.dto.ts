import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString, IsUUID } from 'class-validator';

export class ApproveAccessRequestDto {
  @ApiProperty({
    type: [String],
    description: 'IDs des départements à attribuer à l’utilisateur',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  @IsString({ each: true })
  departmentIds!: string[];
}
