import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Nouveau rôle' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Nouveau statut' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs des départements attribués (remplace la sélection ; [] pour tout retirer)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @IsString({ each: true })
  departmentIds?: string[];
}
