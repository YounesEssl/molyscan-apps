import { MOCK_WORKFLOWS } from '@/mocks/workflow.mock';
import type { PriceWorkflow } from '@/schemas/workflow.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const workflowService = {
  async getAll(): Promise<PriceWorkflow[]> {
    await delay(300);
    return MOCK_WORKFLOWS;
  },

  async getById(id: string): Promise<PriceWorkflow | undefined> {
    await delay(200);
    return MOCK_WORKFLOWS.find((w) => w.id === id);
  },

  async create(data: Partial<PriceWorkflow>): Promise<PriceWorkflow> {
    await delay(500);
    const now = new Date().toISOString();
    return {
      id: `wf-${Date.now()}`,
      scanId: data.scanId ?? '',
      productName: data.productName ?? '',
      molydalRef: data.molydalRef ?? '',
      clientName: data.clientName ?? '',
      quantity: data.quantity ?? 0,
      unit: data.unit ?? 'L',
      requestedPrice: data.requestedPrice,
      status: 'submitted',
      steps: [
        { status: 'draft', date: now, actor: 'Vous' },
        { status: 'submitted', date: now, actor: 'Vous' },
      ],
      createdAt: now,
      updatedAt: now,
    };
  },
};
