import { defaultAppLanguage, scanRequestLanguage } from './appLanguage';

describe('Default app and scan language', () => {
  it('uses French for a French phone without a stored preference', () => {
    expect(defaultAppLanguage([{ languageCode: 'fr' }, { languageCode: 'en' }])).toBe('fr');
    expect(defaultAppLanguage([{ languageCode: 'fr-FR' }])).toBe('fr');
  });
  it('keeps English or the first supported phone language', () => {
    expect(defaultAppLanguage([{ languageCode: 'en' }, { languageCode: 'fr' }])).toBe('en');
    expect(defaultAppLanguage([{ languageCode: 'de' }, { languageCode: 'fr' }])).toBe('fr');
    expect(defaultAppLanguage([{ languageCode: 'de' }])).toBe('en');
  });
  it('normalizes scan language without leaking a region-specific code', () => {
    expect(scanRequestLanguage('fr-FR')).toBe('fr');
    expect(scanRequestLanguage('en-US')).toBe('en');
    expect(scanRequestLanguage(undefined)).toBe('fr');
  });
});
