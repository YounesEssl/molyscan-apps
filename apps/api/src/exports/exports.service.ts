import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CsvGenerator } from './generators/csv.generator';
import { XlsxGenerator } from './generators/xlsx.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { ExportConfigDto } from './dto/export-config.dto';
import { ExportFormat, ExportStatus, NotificationType, ScanStatus } from '@prisma/client';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private notificationsService: NotificationsService,
    private csvGenerator: CsvGenerator,
    private xlsxGenerator: XlsxGenerator,
    private pdfGenerator: PdfGenerator,
  ) {}

  async findAll(userId: string) {
    const records = await this.prisma.exportRecord.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      format: r.format,
      generatedAt: r.generatedAt.toISOString(),
      size: r.size || '0 Ko',
      status: r.status,
    }));
  }

  async generate(userId: string, config: ExportConfigDto) {
    const fileName = `export-${config.format}-${Date.now()}.${config.format}`;

    const record = await this.prisma.exportRecord.create({
      data: {
        fileName,
        format: config.format,
        status: ExportStatus.generating,
        filters: config as any,
        userId,
      },
    });

    // Async generation
    this.generateAsync(record.id, userId, config, fileName).catch((err) => {
      this.logger.error(`Export generation failed: ${err}`);
    });

    return {
      id: record.id,
      fileName: record.fileName,
      format: record.format,
      generatedAt: record.generatedAt.toISOString(),
      size: record.size || '0 Ko',
      status: record.status,
    };
  }

  private async generateAsync(
    recordId: string,
    userId: string,
    config: ExportConfigDto,
    fileName: string,
  ) {
    try {
      // Fetch scans based on filters
      const where: Record<string, unknown> = { userId };
      if (config.dateRange) {
        where.scannedAt = {
          gte: new Date(config.dateRange.from),
          lte: new Date(config.dateRange.to),
        };
      }
      if (config.filters?.status?.length) {
        where.status = { in: config.filters.status as ScanStatus[] };
      }

      const scans = await this.prisma.scan.findMany({
        where,
        include: {
          competitorProduct: {
            include: {
              equivalences: { include: { molydalProduct: true }, take: 1 },
            },
          },
        },
        orderBy: { scannedAt: 'desc' },
      });

      // Generate file buffer
      let buffer: Buffer;
      let contentType: string;

      switch (config.format) {
        case ExportFormat.csv:
          buffer = await this.csvGenerator.generate(scans);
          contentType = 'text/csv';
          break;
        case ExportFormat.xlsx:
          buffer = await this.xlsxGenerator.generate(scans);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case ExportFormat.pdf:
          buffer = await this.pdfGenerator.generate(scans);
          contentType = 'application/pdf';
          break;
      }

      // Upload to MinIO
      const fileKey = `exports/${userId}/${fileName}`;
      await this.storageService.upload(fileKey, buffer, contentType);

      // Calculate size
      const sizeKb = buffer.length / 1024;
      const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${Math.round(sizeKb)} Ko`;

      // Update record
      await this.prisma.exportRecord.update({
        where: { id: recordId },
        data: { status: ExportStatus.ready, fileKey, size },
      });

      // Notify user
      await this.notificationsService.create(
        userId,
        NotificationType.system,
        'Export prêt',
        `Votre export ${fileName} est disponible au téléchargement.`,
        recordId,
      );
    } catch (error) {
      this.logger.error(`Export generation error: ${error}`);
      await this.prisma.exportRecord.update({
        where: { id: recordId },
        data: { status: ExportStatus.failed },
      });
    }
  }

  async download(id: string, userId: string) {
    const record = await this.prisma.exportRecord.findFirst({
      where: { id, userId },
    });
    if (!record || !record.fileKey) throw new NotFoundException('Export not found');
    if (record.status !== ExportStatus.ready) throw new NotFoundException('Export not ready');

    const stream = await this.storageService.download(record.fileKey);
    return { stream, fileName: record.fileName, format: record.format };
  }
}
