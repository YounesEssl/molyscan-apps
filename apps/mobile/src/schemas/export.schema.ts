import { z } from 'zod';

export const ExportFormatSchema = z.enum(['pdf', 'csv', 'xlsx']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportConfigSchema = z.object({
  format: ExportFormatSchema,
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  includeCharts: z.boolean().default(true),
  filters: z.object({
    status: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
  }).optional(),
});
export type ExportConfig = z.infer<typeof ExportConfigSchema>;

export const ExportRecordSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  format: ExportFormatSchema,
  generatedAt: z.string().datetime(),
  size: z.string(),
  status: z.enum(['ready', 'generating', 'failed']),
});
export type ExportRecord = z.infer<typeof ExportRecordSchema>;
