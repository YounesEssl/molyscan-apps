/**
 * Prod feedback fixtures — built from the 19 conversation_submissions extracted
 * from the production database on 2026-05-11.
 *
 * Each case captures:
 *   - query: what the user originally asked
 *   - expectedProducts: the Molydal product the user *confirmed* as correct
 *   - forbiddenProducts: the Molydal product the IA originally proposed and the user rejected
 *
 * 3 of the 19 prod submissions are NOT in this fixture set because they are not
 * RAG-fixable: SKF LGFG 2 (no valid Molydal match exists), Amada Super ABFM Plus
 * (web search returns no datasheet), OKS2801 (image vision bug, not RAG).
 *
 * Used by rag.prod-feedback.spec.ts (real stack, no mocks).
 */

/**
 * Structured fields that simulate what Gemini Vision would extract from the
 * scanned product image — used by retrieval filters in the scan path.
 */
export interface SimulatedScanFields {
  format?:
    | 'aerosol'
    | 'spray_pump'
    | 'liquid_bottle'
    | 'liquid_drum'
    | 'paste_tube'
    | 'cartridge'
    | 'bulk_drum';
  alimentaire?: boolean;
  ecoResponsable?: boolean;
}

export interface ProdFeedbackCase {
  /** Conversation type: scan-driven product context, or free chat */
  type: 'product' | 'free';
  /** Short identifier */
  name: string;
  /** Initial user question or scanned product label */
  query: string;
  /** Optional scan context (when type === 'product') */
  productContext?: {
    scannedName: string;
    scannedBrand: string;
  };
  /** Structured fields that Gemini Vision would extract — drives hard filters */
  simulatedScan?: SimulatedScanFields;
  /** At least one of these MUST appear in the response */
  expectedProducts: string[];
  /** None of these may appear as the primary recommendation (first 400 chars) */
  forbiddenProducts?: string[];
  /** Free-form note pulled from the user's feedback */
  note?: string;
}

export const PROD_FEEDBACK_CASES: ProdFeedbackCase[] = [
  // ── Scan-driven (product) cases ─────────────────────────────────────────────
  {
    type: 'product',
    name: 'Klüberfluid NH1 CM 4-100 → GR PTFE AL (pas NS 100 AL)',
    query: 'Klüberfluid NH1 CM 4-100',
    productContext: {
      scannedName: 'Klüberfluid NH1 CM 4-100',
      scannedBrand: 'Klüber Lubrication',
    },
    simulatedScan: { format: 'aerosol', alimentaire: true },
    expectedProducts: ['GR PTFE AL'],
    forbiddenProducts: ['NS 100 AL'],
    note: 'Lubrifiant semi-sec NSF H1 avec PTFE solide — IA a manqué le composant PTFE',
  },
  {
    type: 'product',
    name: 'Klüberfood NH1 94-402 → AGL 75 AL (pas M 61)',
    query: 'Klüberfood NH1 94-402',
    productContext: {
      scannedName: 'Klüberfood NH1 94-402',
      scannedBrand: 'Klüber',
    },
    simulatedScan: { format: 'cartridge', alimentaire: true },
    expectedProducts: ['AGL 75 AL'],
    forbiddenProducts: ['M 61'],
    note: 'Graisse roulements NSF H1 PAO — IA a proposé une graisse de mauvaise famille',
  },
  {
    type: 'product',
    name: 'INTERFLON Eco Degreaser → KL 9 H (pas KL 104)',
    query: 'INTERFLON ECO DEGREASER',
    productContext: {
      scannedName: 'ECO DEGREASER',
      scannedBrand: 'INTERFLON',
    },
    simulatedScan: { format: 'liquid_bottle', alimentaire: true, ecoResponsable: true },
    expectedProducts: ['KL 9 H', 'KL9H'],
    forbiddenProducts: ['KL 104'],
    note: 'Dégraissant éco-responsable + alimentaire NSF — KL 104 est solvant non-alimentaire',
  },
  {
    type: 'product',
    name: 'Bardahl Nettoyant Freins → STARNET+ (pas KL 104)',
    query: 'Bardahl Nettoyant freins',
    productContext: {
      scannedName: 'Nettoyant freins / Remmen reiniger',
      scannedBrand: 'Bardahl',
    },
    simulatedScan: { format: 'aerosol' },
    expectedProducts: ['STARNET+', 'STARNET +'],
    forbiddenProducts: ['KL 104'],
    note: 'Dégraissant aérosol évaporation rapide — IA a proposé un solvant en bidon',
  },
  {
    type: 'product',
    name: 'WD-40 Specialist Graisse Spray → GRAISSE 3790 (aérosol)',
    query: 'WD-40 SPECIALIST GRAISSE EN SPRAY',
    productContext: {
      scannedName: 'SPECIALIST GRAISSE EN SPRAY',
      scannedBrand: 'WD-40',
    },
    simulatedScan: { format: 'aerosol' },
    expectedProducts: ['GRAISSE 3790', '3790'],
    note: 'Famille correcte, utilisateur a juste demandé la variante aérosol',
  },
  {
    type: 'product',
    name: 'CRC Contact Cleaner → CONTACTOL NF / STARNET+ (pas DEGRIPPANT ALIMENTAIRE)',
    query: 'CRC Contact Cleaner',
    productContext: {
      scannedName: 'Contact Cleaner',
      scannedBrand: 'CRC',
    },
    simulatedScan: { format: 'aerosol' },
    expectedProducts: ['CONTACTOL', 'STARNET+', 'STARNET +'],
    forbiddenProducts: ['DEGRIPPANT ALIMENTAIRE'],
    note: 'Nettoyant contacts électriques — IA a proposé un dégrippant alimentaire',
  },
  {
    type: 'product',
    name: 'Loctite Aerodag Ceramishield → NB 25 NF (PROTEC NF était une mauvaise correspondance du scan initial)',
    query: 'Loctite Aerodag Ceramishield welding spray',
    productContext: {
      scannedName: 'Aerodag Ceramishield',
      scannedBrand: 'Loctite (Henkel)',
    },
    simulatedScan: { format: 'aerosol' },
    expectedProducts: ['NB 25 NF', 'NB 25'],
    forbiddenProducts: ['PROTEC NF'],
    note: 'Spray anti-projection soudure (MIG/MAG). Le scan prod proposait PROTEC NF mais l\'IA s\'est corrigée en chat et a trouvé NB 25 NF — l\'utilisateur a confirmé "Bien" sur NB 25 NF.',
  },
  {
    type: 'product',
    name: 'Molykote BR-2 Plus → MO 3 (pas MO/5)',
    query: 'Molykote BR-2 Plus High Performance Grease',
    productContext: {
      scannedName: 'BR-2 Plus High Performance Grease',
      scannedBrand: 'MOLYKOTE',
    },
    simulatedScan: { format: 'cartridge' },
    expectedProducts: ['MO 3', 'MO3'],
    forbiddenProducts: ['MO/5', 'MO 5'],
    note: 'Graisse EP au bisulfure de molybdène — IA a choisi le mauvais grade de viscosité',
  },
  {
    type: 'product',
    name: 'Jelt Huile de Coupe Entière → H 528 / STAREX SC / VG CUT 77',
    query: 'Jelt Huile de Coupe Entière',
    productContext: {
      scannedName: 'Huile de Coupe Entière',
      scannedBrand: 'Jelt',
    },
    simulatedScan: { format: 'liquid_drum' },
    expectedProducts: ['H 528', 'H 526', 'STAREX SC', 'STAREX', 'VG CUT 77', 'VGCUT'],
    note: 'Huile de coupe entière liquide. User a suggéré STAREX/VGCUT (aérosols → format différent), mais H 528 reste un match valide pour neat cutting oil en bidon.',
  },
  {
    type: 'product',
    name: 'Modat Millenium → SCA 200',
    query: 'Modat Millenium',
    productContext: {
      scannedName: 'Modat Millenium',
      scannedBrand: 'Modat',
    },
    expectedProducts: ['SCA 200'],
    note: 'IA correcte sur ce cas (utilisateur a dit "Parfait")',
  },

  // ── Free chat cases ─────────────────────────────────────────────────────────
  {
    type: 'free',
    name: 'Interflon Paste HT1200 → NB 1200',
    query: "Peux tu me donner l'équivalence au produit interflon paste ht1200",
    expectedProducts: ['NB 1200'],
    note: 'Pâte de montage HT céramique. Note: l\'IA prod a halluciné PW 30 AL qui n\'existe pas au catalogue — NB 1200 est la seule option valide',
  },
  {
    type: 'free',
    name: 'Igol Usinov 2675 BF → SOLESTER 530 M',
    query: 'Equivalence igol unisov 2675 bf',
    expectedProducts: ['SOLESTER 530 M', 'SOLESTER 530M'],
    note: "Micro-émulsion semi-synthétique biostable — IA n'a pas reconnu SOLESTER 530 M comme produit Molydal de son propre catalogue",
  },
  {
    type: 'free',
    name: 'Igol SHP 50 C → GRAISSE 3790 / LCH 350',
    query: 'Equivalence igol shp 50 c',
    expectedProducts: ['GRAISSE 3790', '3790', 'LCH 350'],
    note: "Graisse multifonctionnelle résistante à l'eau — IA a sur-spécifié des contraintes hydrauliques non demandées",
  },
  {
    type: 'free',
    name: 'L-CALUB / Elkalub LA-8P → FILLMORE AL (si NSF)',
    query: "J'ai besoin d'un équivalent NSF H1 pour Elkalub LA-8P, huile de chaîne haute viscosité",
    expectedProducts: ['FILLMORE AL'],
    note: 'Lubrifiant chaîne haute viscosité NSF H1 — utilisateur a guidé sur FILLMORE AL',
  },
  {
    type: 'free',
    name: 'Bérulube PV DAB 10 → Vaseline Technique',
    query: "Équivalent Molydal pour Bérulube PV DAB 10",
    expectedProducts: ['VASELINE TECHNIQUE', 'VASELINE-TECHNIQUE'],
    note: 'Gelée pétrolière technique — utilisateur a indiqué Vaseline Technique',
  },
  {
    type: 'free',
    name: 'Bérulube PV DAB 10 (duplicate) → Vaseline Technique',
    query: "s'il te plaît donne moi un équivalent pour Bérulube PV DAB 10",
    expectedProducts: ['VASELINE TECHNIQUE', 'VASELINE-TECHNIQUE'],
    note: 'Conversation dupliquée par l\'utilisateur',
  },
];

/**
 * Cases excluded from the eval because they are not RAG-fixable:
 *  - SKF LGFG 2: no Molydal product combines sulfonate Ca complex + NSF H1
 *  - Amada Super ABFM Plus: no public datasheet, web search returns nothing
 *  - OKS2801 leak detector: image vision recognition failure, not in RAG scope
 */
export const PROD_FEEDBACK_OUT_OF_SCOPE = [
  'SKF LGFG 2',
  'Amada Super ABFM Plus',
  'OKS2801 leak detector',
];
