import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AdminPageDto } from './admin-page.dto';

export class CompetitiveIntelligenceQueryDto extends AdminPageDto {
  @IsOptional()
  @IsIn(['product', 'brand'])
  groupBy: 'product' | 'brand' = 'product';

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
