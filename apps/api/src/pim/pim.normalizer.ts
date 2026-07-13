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
}): string {
  const lines: Array<[string, unknown]> = [
    ['Product', product.name], ['Family', product.family], ['Subfamily', product.subfamily],
    ['Short description', product.shortDescription], ['Description', product.description], ['Applications and uses', product.usage],
    ['Base oil', product.baseOil], ['Thickener', product.thickener], ['NLGI grade', product.nlgiGrade],
    ['Viscosity at 40°C', product.viscosity40], ['Base oil viscosity at 40°C', product.baseOilViscosity40],
    ['Minimum temperature °C', product.temperatureMin], ['Maximum temperature °C', product.temperatureMax],
    ['Drop point °C', product.dropPoint], ['DIN classification', product.dinClassification], ['ISO classification', product.isoClassification],
    ['Food grade / NSF', product.foodGrade ? 'yes' : null], ['Eco responsible', product.ecoResponsible ? 'yes' : null],
    ['MOSH/MOAH free', product.moshMoahFree ? 'yes' : null],
    ['References', product.references.map((r) => [r.code, r.packaging].filter(Boolean).join(' — ')).filter(Boolean).join('; ') || null],
  ];
  return lines.filter(([, value]) => value !== null && value !== '' && value !== false).map(([label, value]) => `${label}: ${value}`).join('\n');
}
