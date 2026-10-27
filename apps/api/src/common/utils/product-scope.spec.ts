import { isAdhesiveOrSealant, outOfRangeMessage, scanLanguage } from './product-scope';

describe('Adhesive and sealant exclusion by primary function', () => {
  test.each([
    { category: 'adhesive' }, { category: 'sealant' },
    { name: 'BRIK-CEN CS-350', type: 'high temperature silicone sealant' },
    { type: 'mastic silicone haute température' }, { type: 'colle époxy bi-composant' },
    { type: 'structural adhesive' }, { type: 'cyanoacrylate glue' },
    { type: 'frein-filet anaérobie' }, { type: 'threadlocking adhesive' },
    { type: 'RTV gasket maker' }, { type: 'sealing compound' },
    { type: 'Klebstoff' }, { type: 'Silicondichtstoff' }, { type: 'sellador de silicona' },
    { category: 'grease', type: 'silicone sealant' },
  ])('excludes a bonding/sealing product: %j', (product) => {
    expect(isAdhesiveOrSealant(product)).toBe(true);
  });
  test.each([
    { type: 'silicone grease' }, { type: 'graisse silicone' },
    { type: 'silicone lubricant spray' }, { type: 'huile silicone' },
    { type: 'adhesive chain lubricant' }, { type: 'adhesive grease' },
    { type: 'non-adhesive silicone grease' }, { type: 'anti-adhesive mold release spray' },
    { type: 'antiadhésif silicone de démoulage' }, { type: 'joint sealing grease' },
    { name: 'Loctite SF 7100', type: 'leak detector' },
    { name: 'Loctite', type: 'lubricant' }, { type: 'assembly paste' },
  ])('preserves lubricant/release-agent uses: %j', (product) => {
    expect(isAdhesiveOrSealant(product)).toBe(false);
  });
  test('normalizes language codes and defaults to French for legacy requests', () => {
    expect(scanLanguage('en-US')).toBe('en');
    expect(scanLanguage('fr-FR')).toBe('fr');
    expect(scanLanguage(undefined)).toBe('fr');
    expect(outOfRangeMessage('fr-FR')).toBe('Produit qui n’existe pas dans la gamme Molydal.');
    expect(outOfRangeMessage('en-US')).toContain('not available');
  });
});
