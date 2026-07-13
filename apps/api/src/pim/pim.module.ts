import { Module } from '@nestjs/common';
import { RagModule } from '../chat/rag/rag.module';
import { SellbaseClient } from './sellbase.client';
import { PimSyncService } from './pim-sync.service';
import { PimSchedulerService } from './pim-scheduler.service';
import { PimAdminController } from './pim-admin.controller';

@Module({ imports: [RagModule], providers: [SellbaseClient, PimSyncService, PimSchedulerService], controllers: [PimAdminController], exports: [SellbaseClient, PimSyncService] })
export class PimModule {}
