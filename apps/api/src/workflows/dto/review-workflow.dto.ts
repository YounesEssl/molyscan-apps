import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ApproveWorkflowDto {
  @ApiProperty()
  @IsNumber()
  approvedPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectWorkflowDto {
  @ApiProperty()
  @IsString()
  comment!: string;
}
