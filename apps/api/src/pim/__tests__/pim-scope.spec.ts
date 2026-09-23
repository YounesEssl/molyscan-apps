import { filterCatalogScope, MOLYDAL_ARCHIVE_ELEMENT_ID as ARCHIVE } from '../pim-scope';

const product = (id: number, folder = 2) => ({ element_id_1: 1, element_id_2: folder, element_id_3: 3, element_id_4: id });
const reference = (id: number, parent: number, folder = 2) => ({ ...product(parent, folder), element_id_5: id });

describe('PIM archive scope', () => {
  it('keeps the main catalogue and excludes archive descendants and references', () => {
    const result = filterCatalogScope([product(10), product(20, ARCHIVE)], [reference(100, 10), reference(200, 20, ARCHIVE)], [ARCHIVE]);
    expect(result.products.map((row) => row.element_id_4)).toEqual([10]);
    expect(result.references.map((row) => row.element_id_5)).toEqual([100]);
    expect(result.details).toEqual({ excludedFolderIds: [ARCHIVE], productsExcluded: 1, referencesExcluded: 1 });
  });

  it('gives archive membership priority over a second active placement in either row order', () => {
    for (const rows of [[product(10), product(10, ARCHIVE)], [product(10, ARCHIVE), product(10)]]) {
      const result = filterCatalogScope(rows, [reference(100, 10), reference(101, 10, ARCHIVE)], [ARCHIVE]);
      expect(result.products).toEqual([]);
      expect(result.references).toEqual([]);
    }
  });

  it('excludes a shared archived reference even when placed under another active product', () => {
    const result = filterCatalogScope([product(10), product(20, ARCHIVE)], [reference(100, 20, ARCHIVE), reference(100, 10), reference(101, 10)], [ARCHIVE]);
    expect(result.references.map((row) => row.element_id_5)).toEqual([101]);
  });

  it('uses master membership even when a publication contains only the active placement', () => {
    const result = filterCatalogScope([product(10), product(20)], [reference(100, 10), reference(200, 20)], [ARCHIVE], [product(20, ARCHIVE)]);
    expect(result.products.map((row) => row.element_id_4)).toEqual([10]);
    expect(result.references.map((row) => row.element_id_5)).toEqual([100]);
  });

  it('matches stable folder IDs at every ancestor level without using product names', () => {
    const result = filterCatalogScope([
      { ...product(10), element_id_1: String(ARCHIVE) },
      { ...product(20), element_id_3: ARCHIVE },
      { ...product(30), name: 'Archive oil' },
    ], [], [ARCHIVE]);
    expect(result.products.map((row) => row.element_id_4)).toEqual([30]);
  });

  it('deduplicates kept products and references and rejects orphan references', () => {
    const result = filterCatalogScope([product(10), product(10)], [reference(100, 10), reference(100, 10), reference(101, 99)], [ARCHIVE]);
    expect(result.products).toHaveLength(1);
    expect(result.references.map((row) => row.element_id_5)).toEqual([100]);
  });
});
