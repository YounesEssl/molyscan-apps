export type AppLanguage = 'fr' | 'en';

export function defaultAppLanguage(locales: Array<{ languageCode?: string | null }>): AppLanguage {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase().split(/[-_]/)[0];
    if (code === 'fr' || code === 'en') return code;
  }
  return 'en';
}

export function scanRequestLanguage(language?: string): AppLanguage {
  return language?.toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'fr';
}
