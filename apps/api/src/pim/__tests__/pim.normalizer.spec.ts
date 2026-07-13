import { buildChunk, detectProductType, hash, mergeData, numberValue } from '../pim.normalizer';

describe('PIM normalizer', () => {
  it('hashes canonical objects independently of key order', () => {
    expect(hash({ b: 2, a: { d: 4, c: 3 } })).toBe(hash({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it('applies publication overrides on top of master data', () => {
    expect(mergeData({ '15': { id: 1, id_element: 1, id_valeur: 15, contenu: 'Master', id_langue: 0 } }, { '15': { id: 2, id_element: 1, id_valeur: 15, contenu: 'Web', id_langue: 0 } })['15'].contenu).toBe('Web');
  });

  it('parses localized numeric values', () => {
    expect(numberValue({ '26': { id: 1, id_element: 1, id_valeur: 26, contenu: '211,5 cSt', id_langue: 0 } }, 26)).toBe(211.5);
  });

  it('keeps equipment out of the lubricant catalog', () => {
    expect(detectProductType('POMPE MANUELLE', 'Matériel de graissage')).toBe('equipment');
    expect(detectProductType('AGL 41 NF', 'Graisses')).toBe('lubricant');
  });

  it('builds a deterministic evidence-only product document', () => {
    const content = buildChunk({ name: 'AGL 41 NF', family: 'Graisses', subfamily: null, shortDescription: null, description: 'Graisse pulvérisable', usage: 'Engrenages ouverts', baseOil: 'Minérale', thickener: 'Al X', nlgiGrade: '0', viscosity40: null, baseOilViscosity40: null, temperatureMin: -20, temperatureMax: 140, dropPoint: null, dinClassification: null, isoClassification: null, foodGrade: false, ecoResponsible: false, moshMoahFree: false, references: [{ code: 'AGL41NF1FT', packaging: 'FUT' }] });
    expect(content).toContain('Product: AGL 41 NF');
    expect(content).toContain('Applications and uses: Engrenages ouverts');
    expect(content).toContain('References: AGL41NF1FT — FUT');
  });
});
