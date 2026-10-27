import { normalizeProductText } from './normalize';

export type ScanLanguage = 'fr' | 'en';

export function scanLanguage(language?: string): ScanLanguage {
  return language?.toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'fr';
}

/** Business exclusion by PRIMARY FUNCTION, never by silicone chemistry alone. */
export function isAdhesiveOrSealant(product: {
  name?: string | null; type?: string | null; category?: string | null;
}): boolean {
  if (['adhesive', 'sealant', 'glue'].includes(product.category ?? '')) return true;
  const text = normalizeProductText(`${product.name ?? ''} ${product.type ?? ''}`)
    .replace(/\b(?:anti\s*adhesive|non\s*adhesive|anti\s*adhesif\w*|antiadherent\w*)\b/g, '')
    .replace(/\badhesive\s+(?=(?:chain\s+)?(?:lubricant|grease|oil|spray)\b)/g, '');
  return /\b(?:colles?|mastics?|glues?|sealants?|adhesives?|klebstoff\w*|[a-z]*dichtstoff\w*|adhesivos?|sellador(?:es)?|frein\s*filets?|thread\s*lock(?:er|ing)?|gasket\s*maker|sealing\s*compound)\b/.test(text);
}

export function outOfRangeMessage(language: string = 'fr'): string {
  return scanLanguage(language) === 'en'
    ? 'This product is not available in the Molydal range.'
    : 'Produit qui n’existe pas dans la gamme Molydal.';
}

export function isOutOfRangeMessage(text?: string | null): boolean {
  return text === outOfRangeMessage('fr') || text === outOfRangeMessage('en');
}

export const ADHESIVE_SEALANT_RULE = 'Adhesives, glues, threadlocking adhesives, sealants and mastics are outside the Molydal range. Never propose any Molydal equivalent, closest match or compatibility percentage for them. A silicone sealant is not silicone grease or silicone lubricant. This exclusion overrides old scan guesses and positive mappings for these families. Factual technical explanations or comparisons remain allowed, but never endorse a substitution.';
