import { deviceDocumentLanguage, selectTechnicalSheet } from './documentLanguage';

const sheets = [
  { id: 'fr', kind: 'technical_sheet', language: 'fr', available: true },
  { id: 'es', kind: 'technical_sheet', language: 'es', available: true },
  { id: 'de', kind: 'technical_sheet', language: 'de', available: true },
  { id: 'en', kind: 'technical_sheet', language: 'en', available: true },
];

describe('PIM technical sheet language', () => {
  it('uses the phone language, trying its next preferred language before English', () => {
    expect(deviceDocumentLanguage([{ languageCode: 'es' }])).toBe('es');
    expect(deviceDocumentLanguage([{ languageCode: 'de-DE' }])).toBe('de');
    expect(deviceDocumentLanguage([{ languageCode: 'pl' }, { languageCode: 'it' }])).toBe('it');
    expect(deviceDocumentLanguage([{ languageCode: 'pl' }])).toBe('en');
  });
  it.each([['es-ES', 'es'], ['de-DE', 'de'], ['fr-FR', 'fr'], ['en-US', 'en']])(
    'prefers the available %s document', (locale, expected) => {
      expect(selectTechnicalSheet(sheets, locale)?.id).toBe(expected);
    },
  );
  it('falls back to English and then French without inventing a translation', () => {
    expect(selectTechnicalSheet(sheets.filter((sheet) => sheet.id !== 'es'), 'es')?.id).toBe('en');
    expect(selectTechnicalSheet(sheets.filter((sheet) => !['es', 'en'].includes(sheet.id)), 'es')?.id).toBe('fr');
  });
  it('does not select an unavailable or unrelated document', () => {
    expect(selectTechnicalSheet([{ ...sheets[1], available: false }, { ...sheets[0], kind: 'safety_sheet' }], 'es')).toBeUndefined();
  });
});
