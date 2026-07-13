import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { RagSyncTrigger } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PimSyncService } from '../src/pim/pim-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    const sync = app.get(PimSyncService);
    const run = await sync.requestSync(RagSyncTrigger.manual, 'cli');
    console.log(`PIM RAG sync queued: ${run.id}`);
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const status = await sync.status();
      const current = status.recentRuns.find((candidate) => candidate.id === run.id);
      if (!current) continue;
      console.log(`[${current.status}] products=${current.productsSeen} changed=${current.productsChanged} refs=${current.referencesSeen} chunks=${current.chunksCreated}`);
      if (['completed', 'failed', 'skipped'].includes(current.status)) {
        if (current.error) console.error(current.error);
        process.exitCode = current.status === 'completed' ? 0 : 1;
        break;
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
