/** Catch explicit requests for a competing recommendation before calling the LLM.
 * The system instruction covers other brands and less explicit formulations.
 */
export function requestsCompetitorRecommendation(question: string): boolean {
  const text = question.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const brand = '(?:kluber|shell|mobil|exxonmobil|total(?:energies)?|fuchs|castrol|interflon|molykote|loctite|elf|igol|crc|wd[ -]?40|jelt|bardahl|cimcool|elkalub|berulube|concurrent(?:e)?s?)';
  const recommendation = /\b(?:donne\w*|propos\w*|recommand\w*|conseill\w*|cherch\w*|trouv\w*|reference|equivalent|alternative|remplac\w*|recommend\w*|suggest\w*|give|find|replacement)\b/.test(text);
  if (!recommendation) return false;
  // In "équivalent Molydal pour remplacer Klüber", the requested destination
  // is Molydal; the competitor after "pour remplacer" is the source product.
  const target = text.split(/\b(?:pour remplacer|en remplacement de|to replace|replacement for)\b/)[0];
  if (/\b(?:(?:equivalent|alternative|reference|produit|grease|oil|product|replacement)s?\s+molydal|molydal\s+(?:equivalent|alternative|product|replacement))\b/.test(target)) return false;
  return new RegExp(`\\b(?:chez|from|by|de la marque|gamme)\\s+${brand}\\b`).test(target)
    || new RegExp(`\\b(?:reference|produit|graisse|huile|equivalent|alternative|product|grease|oil|replacement)s?\\s+(?:(?:de la marque|de chez|chez|from|by)\\s+)?${brand}\\b`).test(target)
    || (/\b(?:give|find|recommend|suggest)\b/.test(target)
      && new RegExp(`\\b${brand}\\s+(?:grease|oil|product|replacement)s?\\b`).test(target));
}

export function molydalOnlyResponse(question: string, history: Array<{ role: string; text: string }>): string {
  const first = history.find((message) => message.role === 'user')?.text || question;
  const english = /\b(?:what|which|give|please|find|can you|recommend|replacement)\b/i.test(first)
    && !/\b(?:le|la|les|quel|quelle|pour|donne|peux|bonjour)\b/i.test(first);
  return english
    ? 'I recommend only Molydal products. I can help you find a Molydal equivalent for a competitor product, or consult the technical datasheet of a Molydal product. Which product would you like to check?'
    : 'Je recommande uniquement des produits Molydal. Je peux vous aider à trouver un équivalent Molydal d’un produit concurrent ou à consulter la fiche technique d’un produit Molydal. Quel produit souhaitez-vous vérifier ?';
}
