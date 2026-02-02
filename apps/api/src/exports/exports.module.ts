import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { CsvGenerator } from './generators/csv.generator';
import { XlsxGenerator } from './generators/xlsx.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ExportsController],
  providers: [ExportsService, CsvGenerator, XlsxGenerator, PdfGenerator],
})
export class ExportsModule {}
