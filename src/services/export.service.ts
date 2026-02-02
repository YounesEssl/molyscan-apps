import { MOCK_EXPORTS } from '@/mocks/export.mock';
import type { ExportRecord, ExportConfig } from '@/schemas/export.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const exportService = {
  async getExports(): Promise<ExportRecord[]> {
    await delay(300);
    return MOCK_EXPORTS;
  },

  async generate(config: ExportConfig): Promise<ExportRecord> {
    await delay(1000);
    return {
      id: `exp-${Date.now()}`,
      fileName: `export-${config.format}-${Date.now()}.${config.format}`,
      format: config.format,
      generatedAt: new Date().toISOString(),
      size: '1.2 Mo',
      status: 'generating',
    };
  },
};
