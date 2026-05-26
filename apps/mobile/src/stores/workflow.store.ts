import { create } from 'zustand';
import type { PriceWorkflow, WorkflowStatus } from '@/schemas/workflow.schema';

interface WorkflowState {
  workflows: PriceWorkflow[];
  setWorkflows: (wfs: PriceWorkflow[]) => void;
  addWorkflow: (wf: PriceWorkflow) => void;
  /** Swap an optimistic (offline) workflow for the server-confirmed one. */
  replaceWorkflow: (tempId: string, wf: PriceWorkflow) => void;
  removeWorkflow: (id: string) => void;
  updateWorkflowStatus: (id: string, status: WorkflowStatus, comment?: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: [],
  setWorkflows: (wfs) => set({ workflows: wfs }),
  addWorkflow: (wf) => set((s) => ({ workflows: [wf, ...s.workflows] })),
  replaceWorkflow: (tempId, wf) =>
    set((s) => ({ workflows: s.workflows.map((w) => (w.id === tempId ? wf : w)) })),
  removeWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),
  updateWorkflowStatus: (id, status, comment) =>
    set((s) => ({
      workflows: s.workflows.map((wf) =>
        wf.id === id
          ? {
              ...wf,
              status,
              updatedAt: new Date().toISOString(),
              steps: [
                ...wf.steps,
                { status, date: new Date().toISOString(), actor: 'You', comment },
              ],
            }
          : wf,
      ),
    })),
}));
