/**
 * Canonical form of a product name/brand. Ensures "Molykote BR-2",
 * "MOLYKOTE BR 2" and "molykote  br2" collapse to the same token so equivalence
 * lookups and scan caching are stable. Single source of truth — used by both the
 * scan pipeline and the admin equivalences module.
 */
export function normalizeProductText(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (aérosol -> aerosol)
    .replace(/[-_\s]+/g, ' ') // collapse separators
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Deterministic lookup key for a competitor product: normalized "brand|name".
 * Stored on ProductEquivalence.competitorKey and recomputed at scan time.
 */
export function equivalenceKey(
  brand: string | null | undefined,
  name: string | null | undefined,
): string {
  return `${normalizeProductText(brand)}|${normalizeProductText(name)}`;
}
