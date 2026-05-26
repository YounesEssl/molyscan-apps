import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { useWorkflowStore } from '@/stores/workflow.store';
import type { PriceWorkflow } from '@/schemas/workflow.schema';
import type { OutboxHandler } from './types';
import type { OutboxRow, WorkflowCreatePayload } from '../types';

export const workflowCreateHandler: OutboxHandler = {
  kind: 'workflow_create',

  async send(row: OutboxRow): Promise<unknown> {
    const payload = JSON.parse(row.payload) as WorkflowCreatePayload;
    const response = await api.post(ENDPOINTS.workflows.create, {
      ...payload,
      clientRequestId: row.id,
    });
    return response.data;
  },

  onSuccess(row: OutboxRow, response: unknown): void {
    const serverWorkflow = response as PriceWorkflow;
    if (serverWorkflow?.id) {
      // The optimistic workflow was stored under the outbox id; swap it for
      // the server-confirmed record so the UI shows the real status/id.
      useWorkflowStore.getState().replaceWorkflow(row.id, serverWorkflow);
    }
  },
};
