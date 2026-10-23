import { normalizePimProductName, PimAvailability } from '../../pim/pim-availability';

export function isTechnicalComparison(question: string): boolean {
  return /\b(?:compar\w*|tableau|differences?|versus|vs|vergleich\w*|tabelle|confronto)\b/
    .test(normalizePimProductName(question));
}

export interface ComparisonSelection {
  names: string[];
  aliases: Array<{ mentionedAs: string; name: string }>;
}

/** Resolve a shortened designation only against this conversation's products.
 * Never make an archived name into a global alias for a current grade.
 */
export function selectComparisonProducts(
  question: string,
  history: Array<{ role: string; text: string }>,
  availability: PimAvailability,
  contextNames: string[],
): ComparisonSelection {
  const explicit = availability.findActiveNamesInText(question);
  const contextual = [...new Set(contextNames)].filter((name) =>
    availability.findActiveNamesInText(name).includes(name),
  );
  const normalized = normalizePimProductName(question);
  const asksForOldGrade = /\b(?:ancien\w*|archiv\w*|old|retired|discontinued)\b/.test(normalized);
  const aliases: ComparisonSelection['aliases'] = [];
  for (const name of contextual) {
    if (explicit.includes(name) || asksForOldGrade) continue;
    const tokens = normalizePimProductName(name).split(' ');
    for (let count = tokens.length - 1; count >= 2; count -= 1) {
      const prefix = tokens.slice(0, count);
      if (!prefix.some((token) => /\d/.test(token))) continue;
      const suffix = tokens.slice(count).join(' ');
      if (new RegExp(`\\b(?:sans|without|non)\\s+${suffix}\\b`).test(normalized)) continue;
      const pattern = prefix.map((token) => token.replace(/\+/g, '\\+')).join('\\s*');
      // A different suffix/grade (PERF 80 AL, PERF 800) is not an abbreviation.
      const match = new RegExp(`(?:^|[^a-z0-9+])(${pattern})(?=$|\\s+(?:avec|et|ou|a|au|aux|contre|versus|vs|with|and|or|to|en|pour|for|par)\\b)`).exec(normalized);
      if (!match) continue;
      aliases.push({ mentionedAs: name.split(/\s+/).slice(0, count).join(' '), name });
      break;
    }
  }
  // Two current grades sharing the same abbreviated base are ambiguous.
  const unambiguousAliases = aliases.filter((entry) =>
    !aliases.some((other) => other.mentionedAs === entry.mentionedAs && other.name !== entry.name),
  );
  const names = [...new Set([...explicit, ...unambiguousAliases.map((entry) => entry.name)])];
  if (names.length) return { names: names.slice(0, 6), aliases: unambiguousAliases };
  // Do not replace an explicit, unresolved designation with the scan's product.
  if (asksForOldGrade || /\b[a-z][a-z0-9]*\s*\d/.test(normalized)) return { names: [], aliases: [] };
  const lastAnswer = [...history].reverse().find((message) => message.role === 'assistant');
  const previous = lastAnswer ? availability.findActiveNamesInText(lastAnswer.text) : [];
  return { names: (previous.length ? previous : contextual).slice(0, 6), aliases: [] };
}

export function comparisonInstruction(selection: ComparisonSelection): string {
  return `━━━ CURRENT REQUEST: FACTUAL COMPARISON, NOT A PRODUCT SEARCH ━━━
The user requests a comparison/table. This is expressly allowed when one column is a competitor. Do not refuse it because you recommend only Molydal. The recommendation response format does NOT apply.
Return a compact Markdown comparison table for the requested products, then a short factual conclusion. Do not replace any requested product, introduce alternatives, rank other catalogue products or offer a different shortlist. Missing data for a column must not prevent the table: mark each unsupported value "Non vérifié" (or the equivalent in the conversation language). A comparison does not by itself establish interchangeability.
${selection.names.length ? `The ONLY Molydal products in this comparison are: ${selection.names.join(' ; ')}. Use these exact full designations as table headings. Use ONLY their original FT/catalogue excerpts actually supplied below. If none was retrieved, mark their technical values unverified. Do not claim a supplied FT is missing from the database.` : 'No active Molydal product has been identified unambiguously. Keep the requested identities, mark unsupported values as unverified and ask for the exact designation if needed. Do not choose another product.'}
${selection.aliases.map((alias) => `In THIS conversation only, "${alias.mentionedAs}" refers to "${alias.name}" from the scan/expert context. Briefly state that you are using the full designation ${alias.name} displayed on the scan; do not confuse it with a different or archived base grade.`).join('\n')}
Competitor values require actual search evidence or a user-supplied document; historical AI scan descriptions and previous AI answers are not verified competitor specifications. An expert equivalence validates that mapping, not unsourced numeric values. An expert no-equivalent decision remains in force: explain it without blocking a factual comparison.

`;
}

/** Accept only claims attributed by the search tool, never the model's own
 * purported citations or a scan/reformulation masquerading as a datasheet.
 */
export function verifiedSearchEvidence(metadata: unknown): string {
  const grounding = metadata as {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndices?: number[] }>;
  } | null;
  const chunks = grounding?.groundingChunks ?? [];
  const facts = (grounding?.groundingSupports ?? []).flatMap((support) => {
    const text = support.segment?.text?.trim();
    if (!text || text.length < 20) return [];
    const urls = (support.groundingChunkIndices ?? []).flatMap((index) => {
      const url = chunks[index]?.web?.uri;
      return url && /^https:\/\//.test(url) ? [url] : [];
    });
    return urls.length ? [`${text}\nSources: ${[...new Set(urls)].join(' ; ')}`] : [];
  });
  return [...new Set(facts)].slice(0, 20).join('\n\n');
}

export function comparisonLanguageInstruction(firstQuestion: string): string {
  const text = normalizePimProductName(firstQuestion);
  if (/\b(?:le|la|les|quel|quelle|pour|donne|peux|fais|tableau|bonjour)\b/.test(text)) return 'Write the entire answer in French.';
  if (/\b(?:the|what|which|give|please|find|comparison|can you|show|make)\b/.test(text)) return 'Write the entire answer in English.';
  return `Write the entire answer in the language of this first user message: ${JSON.stringify(firstQuestion)}.`;
}

export function verifiedSearchCitations(metadata: unknown): string {
  const grounding = metadata as {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndices?: number[] }>;
  } | null;
  const links = new Map<string, string>();
  for (const support of grounding?.groundingSupports ?? []) {
    if ((support.segment?.text?.trim().length ?? 0) < 20) continue;
    for (const index of support.groundingChunkIndices ?? []) {
      const web = grounding?.groundingChunks?.[index]?.web;
      if (!web?.uri || !/^https:\/\//.test(web.uri)) continue;
      const title = (web.title || `Source ${links.size + 1}`).replace(/[\[\]<>\n\r]/g, '').slice(0, 100);
      links.set(web.uri, `[${title}](${web.uri})`);
    }
  }
  return links.size ? `\n\nSources : ${[...links.values()].slice(0, 4).join(' · ')}` : '';
}
