import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'marc.dupont@molydal.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Marc' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  // Le rôle est déduit côté serveur du domaine email (jamais envoyé par le
  // client). Le département n'est attendu QUE pour les distributeurs (email hors
  // @molydal.com) ; il est ignoré pour les commerciaux (attribué par l'admin).
  @ApiPropertyOptional({
    description: 'Département demandé — requis pour les inscriptions distributeur',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
