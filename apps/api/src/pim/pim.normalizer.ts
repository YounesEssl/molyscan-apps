import { createHash } from 'crypto';
import type { SellbaseDatum } from './sellbase.client';

type DataMap = Record<string, SellbaseDatum>;

export const CARAC = {
  productName: 15, shortDescription: 17, description: 18, usage: 19,
  nlgi: 23, viscosity40: 26, technicalSheetFr: 364,
  baseOil: 1058, thickener: 1059, dropPoint: 1065,
  temperatureMin: 1339, temperatureMax: 1340,
  din: 1275, iso: 1280, baseOilViscosity40: 1307,
  productCode: 34, referenceLabel: 35, packaging: 67, referenceStatus: 1083,
  erpStatus: 1393,
} as const;

const DOCUMENTS: Record<number, { kind: string; language: string }> = {
  // FDS are normally attached to level-5 commercial references, not products.
  // IDs verified against the production Sellbase characteristic catalogue.
  39: { kind: 'safety_sheet', language: 'fr' },
  1044: { kind: 'safety_sheet', language: 'it' },
  1045: { kind: 'safety_sheet', language: 'es' },
  1046: { kind: 'safety_sheet', language: 'en' },
  1047: { kind: 'safety_sheet', language: 'de' },
  1052: { kind: 'safety_sheet', language: 'pl' },
  1054: { kind: 'safety_sheet', language: 'no' },
  1055: { kind: 'safety_sheet', language: 'pt' },
  1056: { kind: 'safety_sheet', language: 'ro' },
  1057: { kind: 'safety_sheet', language: 'cs' },
  1304: { kind: 'safety_sheet', language: 'hu' },
  1523: { kind: 'safety_sheet', language: 'sk' },
  103: { kind: 'product_sheet', language: 'fr' },
  364: { kind: 'technical_sheet', language: 'fr' },
  1026: { kind: 'product_sheet', language: 'fr' },
  1029: { kind: 'product_sheet', language: 'it' },
  1030: { kind: 'technical_sheet', language: 'it' },
  1033: { kind: 'product_sheet', language: 'es' },
  1034: { kind: 'technical_sheet', language: 'es' },
  1037: { kind: 'product_sheet', language: 'en' },
  1038: { kind: 'technical_sheet', language: 'en' },
  1041: { kind: 'product_sheet', language: 'de' },
  1042: { kind: 'technical_sheet', language: 'de' },
  1124: { kind: 'food_certificate', language: 'fr' },
  1306: { kind: 'gmo_certificate', language: 'fr' },
  1364: { kind: 'biopreferred_certificate', language: 'fr' },
};

export function mergeData(master?: DataMap, override?: DataMap): DataMap {
  return { ...(master ?? {}), ...(override ?? {}) };
}

export function hash(value: unknown): string {
  const stable = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)]));
    }
    return input;
  };
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function text(data: DataMap, id: number): string | null {
  const value = data[String(id)]?.contenu?.trim();
  return value || null;
}

export function numberValue(data: DataMap, id: number): number | null {
  const raw = text(data, id);
  if (!raw) return null;
  const match = raw.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function boolFromAny(data: DataMap, ids: number[]): boolean {
  return ids.some((id) => /^(oui|yes|true|1|nsf h1|h1)$/i.test(text(data, id) ?? ''));
}

export type CertificationEvidence = {
  issuer: 'NSF' | '2probity';
  category: string;
  sourceCaracId: number;
};

const claimText = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').toLowerCase();
const CATEGORY = /\b(?:h[123]|3h|a[1-8]|k[1-3])\b/g;
const CLAIM_FIELDS = [16, 17, 18, 130];

function issuerForCategory(sentence: string, index: number): CertificationEvidence['issuer'] | null {
  const issuers = [...sentence.matchAll(/\b(?:nsf|nfc|2\s?probity)\b/g)];
  const preceding = issuers.filter((match) => match.index! < index).at(-1);
  const match = preceding ?? issuers.find((item) => item.index! - index < 100);
  if (match && preceding) {
    const span = sentence.slice(match.index! + match[0].length, index);
    if (span.length > 140) return null;
    const previousCategory = [...span.matchAll(CATEGORY)].at(-1);
    // A1 cleaners can mention H1 lubricants later in their description. Only
    // an actual category list (e.g. "H1 et 3H") shares the same issuer claim.
    if (previousCategory && !/^(?:\s|,|\/|&|\+|-|\bet\b|\band\b)*$/.test(span.slice(previousCategory.index! + previousCategory[0].length))) return null;
  } else if (match) {
    const span = sentence.slice(index, match.index!);
    if (!/^(?:h[123]|3h|a[1-8]|k[1-3])\s*(?:[-:]\s*)?(?:(?:registered|certified|approved|enregistre\w*|certifie\w*|homologue\w*)\s+)?(?:(?:by|par)\s+)?$/.test(span)) return null;
  }
  return match ? (/2\s?probity/.test(match[0]) ? '2probity' : 'NSF') : null;
}

function categoryIsNegated(sentence: string, start: number, end: number): boolean {
  const before = sentence.slice(Math.max(0, start - 80), start);
  const after = sentence.slice(end, end + 65);
  return /\b(?:non|not|no|pas|sans|aucune?)\b[^,;.!?]{0,60}$/.test(before)
    || /^\s*(?:[:—-]\s*)?(?:(?:non|not)\s+(?:certifi|homolog|enregistr|approv)|(?:retire|revoque|expire|revoked|expired)\b)/.test(after)
    || /\b(?:en attente|pending|demande de certification|certification requested)\b/.test(sentence);
}

/** Interpret only explicit PIM evidence; NSF A1/3H must never become NSF H1. */
export function productCertifications(data: DataMap) {
  const evidence: CertificationEvidence[] = [];
  const negated = new Set<string>();
  const add = (issuer: CertificationEvidence['issuer'], category: string, sourceCaracId: number) => {
    evidence.push({ issuer, category: category.toUpperCase(), sourceCaracId });
  };
  // Dedicated certificate/logo characteristics. Production uses NFC_Mark in
  // several NSF filenames; generic NSF/2probity logos do not identify a class.
  for (const id of [47, 1124, 1373, 1380, 1378]) {
    const value = claimText(text(data, id) ?? '').replace(/[_/.-]+/g, ' ');
    for (const match of value.matchAll(CATEGORY)) {
      const issuer = issuerForCategory(value, match.index!);
      if (issuer && !categoryIsNegated(value, match.index!, match.index! + match[0].length)) add(issuer, match[0], id);
    }
  }
  for (const id of CLAIM_FIELDS) {
    // French is the canonical catalogue copy. A translated legacy certificate
    // must not overrule a newer explicit issuer/category in French.
    if (id === 130 && (evidence.some((entry) => [16, 17, 18].includes(entry.sourceCaracId)) || negated.size)) continue;
    const value = claimText(text(data, id) ?? '').replace(/2probity\.eu/g, '2probity');
    for (const sentence of value.split(/[.!?;\n]+/)) {
      for (const match of sentence.matchAll(CATEGORY)) {
        const category = match[0].toUpperCase();
        const issuer = issuerForCategory(sentence, match.index!);
        if (categoryIsNegated(sentence, match.index!, match.index! + match[0].length)) {
          for (const rejectedIssuer of issuer ? [issuer] : ['NSF', '2probity']) negated.add(`${rejectedIssuer}:${category}`);
        } else if (issuer && !/\b(?:requis|exige|required|requirement|must|doit|remplac|substitut)/.test(sentence)) {
          add(issuer, category, id);
        }
      }
    }
  }
  const certifications = evidence.filter((entry) => !negated.has(`${entry.issuer}:${entry.category}`))
    .filter((entry, index, all) => all.findIndex((other) => other.issuer === entry.issuer && other.category === entry.category) === index)
    .sort((a, b) => `${a.issuer}:${a.category}`.localeCompare(`${b.issuer}:${b.category}`));
  const descriptions = CLAIM_FIELDS.map((id) => claimText(text(data, id) ?? ''));
  const ecoNegated = descriptions.some((value) => /\b(?:non|not|no|pas|sans|aucune?)\b[^,;.!?]{0,45}\b(?:eco[ -]?responsable|eco[ -]?friendly|ecolabel|biopreferred)\b/.test(value));
  const explicitEco = descriptions.some((value) => value.split(/[.!?;\n]+/).some((sentence) =>
    /\b(?:eco[ -]?responsable|eco[ -]?friendly|ecolabel|biopreferred)\b/.test(sentence)
    && !/\b(?:non|not|no|pas|sans|aucune?)\b[^,;.!?]{0,45}\b(?:eco[ -]?responsable|eco[ -]?friendly|ecolabel|biopreferred)\b/.test(sentence)));
  const bioPreferred = [1364, 1376].some((id) => /biopreferred/i.test(text(data, id) ?? ''));
  const moshLogo = claimText(text(data, 1374) ?? '').replace(/[_/-]+/g, ' ');
  return {
    certifications,
    nsfCategories: certifications.filter((entry) => entry.issuer === 'NSF').map((entry) => entry.category),
    foodGrade: certifications.some((entry) => entry.category === 'H1'),
    ecoResponsible: !ecoNegated && (explicitEco || bioPreferred),
    moshMoahFree: /\bmosh\s+moah\s+free\b/.test(moshLogo)
      || descriptions.some((value) => /\bsans\s+mosh\s*[/, -]*\s*moah\b|\bmosh\s*[/, -]*\s*moah\s*[- ]*free\b/.test(value)),
  };
}

export function latestDate(data: DataMap): Date | null {
  const values = Object.values(data).map((d) => d.date_de_modification).filter(Boolean).sort();
  return values.length ? new Date(values[values.length - 1] as string) : null;
}

export function detectProductType(name: string, family: string | null): string {
  const value = `${family ?? ''} ${name}`;
  return /(mat[ée]riel|pompe|raccord|flexible|graisseur|doseur|enrouleur|couvercle|fontaine|kit de distribution|centrale)/i.test(value)
    ? 'equipment'
    : 'lubricant';
}

export function documents(data: DataMap) {
  return Object.entries(DOCUMENTS).flatMap(([rawId, meta]) => {
    const id = Number(rawId);
    const datum = data[String(id)];
    if (!datum?.contenu?.trim()) return [];
    return [{ sellbaseCaracId: id, ...meta, fileName: datum.contenu.trim(), sourceUpdatedAt: datum.date_de_modification ? new Date(datum.date_de_modification) : null }];
  });
}

export function buildChunk(product: {
  name: string; family: string | null; subfamily: string | null; shortDescription: string | null;
  description: string | null; usage: string | null; baseOil: string | null; thickener: string | null;
  nlgiGrade: string | null; viscosity40: number | null; baseOilViscosity40: number | null;
  temperatureMin: number | null; temperatureMax: number | null; dropPoint: number | null;
  dinClassification: string | null; isoClassification: string | null; foodGrade: boolean;
  ecoResponsible: boolean; moshMoahFree: boolean; references: Array<{ code: string | null; packaging: string | null }>;
  certifications?: CertificationEvidence[];
}): string {
  const lines: Array<[string, unknown]> = [
    ['Product', product.name], ['Family', product.family], ['Subfamily', product.subfamily],
    ['Short description', product.shortDescription], ['Description', product.description], ['Applications and uses', product.usage],
    ['Base oil', product.baseOil], ['Thickener', product.thickener], ['NLGI grade', product.nlgiGrade],
    ['Viscosity at 40°C', product.viscosity40], ['Base oil viscosity at 40°C', product.baseOilViscosity40],
    ['Minimum temperature °C', product.temperatureMin], ['Maximum temperature °C', product.temperatureMax],
    ['Drop point °C', product.dropPoint], ['DIN classification', product.dinClassification], ['ISO classification', product.isoClassification],
    ['Certified food-contact category H1', product.foodGrade ? 'yes' : null],
    ['Certifications', product.certifications?.map((entry) => `${entry.issuer} ${entry.category}`).join('; ') || null],
    ['Eco responsible', product.ecoResponsible ? 'yes' : null],
    ['MOSH/MOAH free', product.moshMoahFree ? 'yes' : null],
    ['References', product.references.map((r) => [r.code, r.packaging].filter(Boolean).join(' — ')).filter(Boolean).join('; ') || null],
  ];
  return lines.filter(([, value]) => value !== null && value !== '' && value !== false).map(([label, value]) => `${label}: ${value}`).join('\n');
}
