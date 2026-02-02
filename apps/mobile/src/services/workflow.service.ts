import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { PriceWorkflow } from '@/schemas/workflow.schema';

export const workflowService = {
  async getAll(): Promise<PriceWorkflow[]> {
    const response = await api.get(ENDPOINTS.workflows.list);
    // Paginated endpoint returns { data, meta } — extract data
    return response.data.data ?? response.data;
  },

  async getById(id: string): Promise<PriceWorkflow | undefined> {
    const response = await api.get(ENDPOINTS.workflows.detail(id));
    return response.data;
  },

  async create(data: Partial<PriceWorkflow>): Promise<PriceWorkflow> {
    const response = await api.post(ENDPOINTS.workflows.create, data);
    return response.data;
  },
};
