export const DOCUMENT_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'] as const;
export type DocumentLanguage = (typeof DOCUMENT_LANGUAGES)[number];

/** Use the phone's preferred supported language, never the app UI language or GPS. */
export function deviceDocumentLanguage(locales: Array<{ languageCode?: string | null }>): DocumentLanguage {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase().split(/[-_]/)[0];
    const supported = DOCUMENT_LANGUAGES.find((language) => language === code);
    if (supported) return supported;
  }
  return 'en';
}

/** Select only an existing PIM document; never synthesize or translate a FT. */
export function selectTechnicalSheet<T extends { kind: string; available: boolean; language: string }>(
  documents: T[],
  preferredLanguage: string,
): T | undefined {
  const sheets = documents.filter((document) => document.kind === 'technical_sheet' && document.available);
  const language = preferredLanguage.toLowerCase().split(/[-_]/)[0];
  return sheets.find((document) => document.language === language)
    ?? sheets.find((document) => document.language === 'en')
    ?? sheets.find((document) => document.language === 'fr')
    ?? sheets[0];
}
