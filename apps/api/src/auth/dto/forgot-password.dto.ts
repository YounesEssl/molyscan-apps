import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'marc.dupont@molydal.com' })
  @IsEmail()
  email!: string;
}
