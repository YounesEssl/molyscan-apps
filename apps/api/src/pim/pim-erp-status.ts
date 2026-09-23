import type { SellbaseDatum, SellbaseElement } from './sellbase.client';

export const ERP_SLEEP_CHARACTERISTIC_ID = 1393;
type DataMap = Record<string, SellbaseDatum>;
export type ErpReferenceState = 'active' | 'sleeping' | 'missing' | 'invalid';

/** Prefer canonical master metadata, allowing consistent legacy translations. */
export function mergeErpStatusDatum(previous: SellbaseDatum | undefined, incoming: SellbaseDatum): SellbaseDatum {
  if (!previous || incoming.id_langue === 0) return incoming;
  if (previous.id_langue === 0) return previous;
  const values = new Set([
    ...(previous.erpStatusConflictingValues ?? [String(previous.contenu).trim()]),
    String(incoming.contenu).trim(),
  ]);
  if (values.size === 1) return previous;
  // Retain the original datum and conflicting values as audit metadata rather
  // than manufacturing an ERP status or letting row order choose availability.
  return { ...previous, erpStatusConflictingValues: [...values] };
}

/** Input must come from base0, independent of the publication/legacy1083 field. */
export function erpReferenceStatus(master?: DataMap): { state: ErpReferenceState; value: string | null } {
  const datum = master?.[String(ERP_SLEEP_CHARACTERISTIC_ID)];
  if (!datum) return { state: 'missing', value: null };
  if (datum.erpStatusConflictingValues?.length) return { state: 'invalid', value: null };
  const raw: unknown = datum.contenu;
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return { state: 'missing', value: null };
  const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : null;
  if (value === '0') return { state: 'active', value };
  if (value === '1') return { state: 'sleeping', value };
  return { state: 'invalid', value };
}

/** Build and validate the complete availability plan before any catalogue write. */
export function planErpAvailability(
  products: SellbaseElement[],
  references: SellbaseElement[],
  master: Record<string, DataMap>,
  previousReferences: Array<{ sellbaseElementId: number; rawData: unknown }>,
) {
  const productIds = new Set(products.map((row) => Number(row.element_id_4)));
  const rows = references.filter((row) => productIds.has(Number(row.element_id_4)));
  const states = new Map(rows.map((row) => [Number(row.element_id_5), erpReferenceStatus(master[String(row.element_id_5)])]));
  const activeProductIds = new Set(rows.filter((row) => states.get(Number(row.element_id_5))?.state === 'active')
    .map((row) => Number(row.element_id_4)));
  const referencesByState: Record<ErpReferenceState, number> = { active: 0, sleeping: 0, missing: 0, invalid: 0 };
  for (const result of states.values()) referencesByState[result.state]++;
  const known = (state?: ErpReferenceState) => state === 'active' || state === 'sleeping';
  const previouslyKnown = previousReferences.filter((row) => states.has(row.sellbaseElementId)
    && known(erpReferenceStatus(row.rawData as DataMap).state));
  const lostKnownStatuses = previouslyKnown.filter((row) => !known(states.get(row.sellbaseElementId)?.state)).length;
  const knownStatuses = referencesByState.active + referencesByState.sleeping;
  const coverage = states.size ? knownStatuses / states.size : 0;
  // A few genuinely missing statuses must become inactive. A broken/partial
  // endpoint must not deactivate a large part of the catalogue in one run.
  if (coverage < 0.8 || lostKnownStatuses > previouslyKnown.length * 0.1) {
    throw new Error(`Safety stop: incomplete ERP 1393 source (${knownStatuses}/${states.size} known, ${lostKnownStatuses}/${previouslyKnown.length} previous statuses lost)`);
  }
  return {
    rows, states, activeProductIds,
    details: {
      characteristicId: ERP_SLEEP_CHARACTERISTIC_ID,
      sourceBaseId: 0,
      references: referencesByState,
      knownStatusCoverage: coverage,
      previouslyKnownStatuses: previouslyKnown.length,
      lostKnownStatuses,
      productsWithActiveReference: activeProductIds.size,
      productsWithoutActiveReference: products.length - activeProductIds.size,
    },
  };
}
