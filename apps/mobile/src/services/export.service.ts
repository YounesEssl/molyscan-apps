import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { ExportRecord, ExportConfig } from '@/schemas/export.schema';

export const exportService = {
  async getExports(): Promise<ExportRecord[]> {
    const response = await api.get(ENDPOINTS.exports.list);
    return response.data;
  },

  async generate(config: ExportConfig): Promise<ExportRecord> {
    const response = await api.post(ENDPOINTS.exports.generate, config);
    return response.data;
  },
};
