import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'marc.dupont@molydal.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par email' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'nouveauMotDePasse', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
