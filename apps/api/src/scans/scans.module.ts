import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ImageAnalysisService } from './image-analysis.service';
import { ProductsModule } from '../products/products.module';
import { RagModule } from '../chat/rag/rag.module';

@Module({
  imports: [ProductsModule, RagModule],
  controllers: [ScansController],
  providers: [ScansService, ImageAnalysisService],
  exports: [ScansService],
})
export class ScansModule {}
