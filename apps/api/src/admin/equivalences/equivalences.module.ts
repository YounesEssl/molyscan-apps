import { Module } from '@nestjs/common';
import { EquivalencesController } from './equivalences.controller';
import { EquivalencesService } from './equivalences.service';

@Module({
  controllers: [EquivalencesController],
  providers: [EquivalencesService],
  exports: [EquivalencesService],
})
export class EquivalencesModule {}
