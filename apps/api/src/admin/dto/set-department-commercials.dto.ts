import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetDepartmentCommercialsDto {
  @ApiProperty({
    type: [String],
    description:
      'IDs des commerciaux (rôle commercial) à affecter au département. Remplace la liste actuelle des commerciaux ; les distributeurs rattachés ne sont pas touchés. Liste vide = aucun commercial (repli admins).',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  userIds!: string[];
}
