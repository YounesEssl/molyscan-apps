import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RagSyncTrigger } from '@prisma/client';
import { PimSyncService } from './pim-sync.service';

@Injectable()
export class PimSchedulerService {
  private readonly logger = new Logger(PimSchedulerService.name);
  constructor(private readonly sync: PimSyncService) {}

  @Cron('0 3 1 * *', { timeZone: 'Europe/Paris' })
  async monthlySync() {
    try { await this.sync.requestSync(RagSyncTrigger.scheduled); }
    catch (error) { this.logger.warn(`Monthly PIM sync not started: ${error instanceof Error ? error.message : error}`); }
  }
}
