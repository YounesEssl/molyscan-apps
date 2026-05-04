import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, MaxLength, ValidateIf } from 'class-validator';

export class EquivalentFeedbackDto {
  @ApiProperty({ description: 'Name of the AI-proposed equivalent the user voted on' })
  @IsString()
  @MaxLength(200)
  equivalentName!: string;

  @ApiProperty({ enum: ['up', 'down'], description: 'Up = approved, Down = rejected' })
  @IsIn(['up', 'down'])
  vote!: 'up' | 'down';

  @ApiProperty({
    required: false,
    description: 'When vote=down, the equivalent the user thinks should have been suggested',
  })
  @ValidateIf((o) => o.vote === 'down')
  @IsString()
  @IsOptional()
  @MaxLength(200)
  suggestedName?: string;
}
