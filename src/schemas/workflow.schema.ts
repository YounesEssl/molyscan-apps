import { z } from 'zod';

export const WorkflowStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowStepSchema = z.object({
  status: WorkflowStatusSchema,
  date: z.string().datetime(),
  actor: z.string(),
  comment: z.string().optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const PriceWorkflowSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  productName: z.string(),
  molydalRef: z.string(),
  clientName: z.string(),
  quantity: z.number(),
  unit: z.string().default('L'),
  requestedPrice: z.number().optional(),
  approvedPrice: z.number().optional(),
  status: WorkflowStatusSchema,
  steps: z.array(WorkflowStepSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PriceWorkflow = z.infer<typeof PriceWorkflowSchema>;
