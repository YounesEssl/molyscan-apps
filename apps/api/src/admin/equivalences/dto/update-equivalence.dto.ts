import { PartialType } from '@nestjs/swagger';
import { CreateEquivalenceDto } from './create-equivalence.dto';

export class UpdateEquivalenceDto extends PartialType(CreateEquivalenceDto) {}
