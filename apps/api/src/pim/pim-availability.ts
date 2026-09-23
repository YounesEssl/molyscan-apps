import type { PrismaService } from '../prisma/prisma.service';

/** Exact catalogue identity: accents/separators fold, grade suffixes such as + stay. */
export function normalizePimProductName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ').replace(/\s*\+/g, '+').trim();
}

export class PimAvailability {
  private readonly active: Set<string>;
  private readonly inactive: Set<string>;
  private readonly activeReferences: Set<string>;
  private readonly inactiveReferences: Set<string>;

  constructor(rows: Array<{ name: string; active: boolean; references?: Array<{ code: string | null; active: boolean }> }>) {
    this.active = new Set(rows.filter((row) => row.active).map((row) => normalizePimProductName(row.name)));
    // Different element IDs may have the same name: an active homonym remains
    // available even when an older PIM record with that name was archived.
    this.inactive = new Set(rows.filter((row) => !row.active)
      .map((row) => normalizePimProductName(row.name)).filter((name) => name && !this.active.has(name)));
    const references = rows.flatMap((row) => (row.references ?? []).map((reference) => ({
      code: normalizePimProductName(reference.code ?? ''), active: row.active && reference.active,
    })));
    this.activeReferences = new Set(references.filter((reference) => reference.active && reference.code).map((reference) => reference.code));
    this.inactiveReferences = new Set(references.filter((reference) => !reference.active && reference.code
      && !this.activeReferences.has(reference.code)).map((reference) => reference.code));
  }

  isInactive(name?: string | null): boolean {
    return !!name && this.inactive.has(normalizePimProductName(name));
  }

  isInactiveReference(code?: string | null): boolean {
    return !!code && this.inactiveReferences.has(normalizePimProductName(code));
  }

  sanitizeExpertNote<T extends { note?: string | null }>(expert: T): T {
    return expert.note && this.mentionsInactive(expert.note) ? { ...expert, note: null } : expert;
  }

  mentionsInactive(text: string): boolean {
    let normalized = ` ${normalizePimProductName(text)} `;
    // Mask individual active-name occurrences, longest first. A longer active
    // grade must not hide a separate mention of its archived base product.
    // A plain-text collision with a current product name or reference is
    // ambiguous: keep it. Explicit reference fields use isInactiveReference.
    for (const name of [...new Set([...this.active, ...this.activeReferences])].sort((a, b) => b.length - a.length)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      normalized = normalized.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g'), ' ');
    }
    return [...this.inactive, ...this.inactiveReferences].some((name) => normalized.includes(` ${name} `));
  }

  sanitizeHistory<T extends { role: string; text: string }>(history: T[]): T[] {
    return history.map((message) => message.role === 'assistant' && this.mentionsInactive(message.text)
      ? { ...message, text: '[Previous recommendation withdrawn: it mentioned a Molydal product or reference no longer active in the catalogue. Search the current active catalogue for a replacement.]' }
      : message);
  }
}

/** Read on every request so the next PIM activation immediately takes effect. */
export async function loadPimAvailability(prisma?: Pick<PrismaService, 'pimProduct'>): Promise<PimAvailability> {
  return new PimAvailability(prisma ? await prisma.pimProduct.findMany({
    select: { name: true, active: true, references: { select: { code: true, active: true } } },
  }) : []);
}

export const ACTIVE_CATALOGUE_RULE = 'Only currently active Molydal products and commercial references from the supplied catalogue may be recommended. Historical suggestions and expert mappings to inactive products are withdrawn; this is not an expert decision that no equivalent exists. A product may remain active while a former reference or packaging is discontinued: use only references and packaging listed in its current catalogue datasheet. Search the current active catalogue for a suitable replacement, and do not invent one.';
