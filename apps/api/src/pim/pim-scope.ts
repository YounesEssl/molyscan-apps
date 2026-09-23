import type { SellbaseElement } from './sellbase.client';

// Verified in the Molydal master catalogue on 2026-09-23: level 2,
// characteristic 10 = ARCHIVAGE PRODUITS. Element IDs survive folder moves.
export const MOLYDAL_ARCHIVE_ELEMENT_ID = 25012891;

/** Archive membership wins over other placements of the same product/reference. */
export function filterCatalogScope(
  products: SellbaseElement[],
  references: SellbaseElement[],
  excludedFolderIds: number[],
  masterRows: SellbaseElement[] = [...products, ...references],
) {
  const excluded = new Set(excludedFolderIds);
  const inExcludedFolder = (row: SellbaseElement) => [1, 2, 3].some(
    (level) => excluded.has(Number(row[`element_id_${level}`])),
  );
  const classificationRows = [...masterRows, ...products, ...references];
  const archivedProductIds = new Set(classificationRows.filter(inExcludedFolder)
    .map((row) => Number(row.element_id_4)).filter(Boolean));
  const archivedReferenceIds = new Set(classificationRows
    .filter((row) => inExcludedFolder(row) || archivedProductIds.has(Number(row.element_id_4)))
    .map((row) => Number(row.element_id_5)).filter(Boolean));
  const unique = (rows: SellbaseElement[], level: 4 | 5) => new Map(rows
    .filter((row) => Number(row[`element_id_${level}`]) > 0)
    .map((row) => [Number(row[`element_id_${level}`]), row]));
  const allProducts = unique(products, 4);
  const allReferences = unique(references, 5);
  const keptProducts = unique(products.filter((row) => !inExcludedFolder(row)
    && !archivedProductIds.has(Number(row.element_id_4))), 4);
  const keptReferences = unique(references.filter((row) => !inExcludedFolder(row)
    && !archivedReferenceIds.has(Number(row.element_id_5))
    && keptProducts.has(Number(row.element_id_4))), 5);
  return {
    products: [...keptProducts.values()],
    references: [...keptReferences.values()],
    details: {
      excludedFolderIds,
      productsExcluded: allProducts.size - keptProducts.size,
      referencesExcluded: allReferences.size - keptReferences.size,
    },
  };
}
