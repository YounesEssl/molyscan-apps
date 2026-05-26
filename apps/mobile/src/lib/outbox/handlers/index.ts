import type { OutboxKind } from '../types';
import type { OutboxHandler } from './types';
import { scanAnalysisHandler } from './scanAnalysis.handler';
import { workflowCreateHandler } from './workflowCreate.handler';

const REGISTRY: Record<OutboxKind, OutboxHandler> = {
  scan_analysis: scanAnalysisHandler,
  workflow_create: workflowCreateHandler,
};

export function getHandler(kind: OutboxKind): OutboxHandler {
  const handler = REGISTRY[kind];
  if (!handler) {
    throw new Error(`No outbox handler registered for kind "${kind}"`);
  }
  return handler;
}

export type { OutboxHandler } from './types';
