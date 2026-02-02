import type { ExportRecord } from '@/schemas/export.schema';

export const MOCK_EXPORTS: ExportRecord[] = [
  {
    id: 'exp-001',
    fileName: 'rapport-scans-janvier-2025.pdf',
    format: 'pdf',
    generatedAt: '2025-01-28T18:00:00.000Z',
    size: '2.4 Mo',
    status: 'ready',
  },
  {
    id: 'exp-002',
    fileName: 'export-donnees-Q4-2024.xlsx',
    format: 'xlsx',
    generatedAt: '2025-01-15T10:30:00.000Z',
    size: '1.1 Mo',
    status: 'ready',
  },
  {
    id: 'exp-003',
    fileName: 'scans-semaine-04.csv',
    format: 'csv',
    generatedAt: '2025-01-28T20:00:00.000Z',
    size: '340 Ko',
    status: 'generating',
  },
];
