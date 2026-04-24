/**
 * Eval fixtures — mock chunks and expected answers for each conversation test case.
 *
 * Each case provides chunks that SHOULD be retrievable once the vector store CSV is
 * properly populated. For now, we inject them directly so we can test the LLM
 * selection logic independently of retrieval quality.
 *
 * Similarity scores mirror the ordering observed in the broken conversations so we
 * verify the improved system prompt selects correctly despite misleading scores.
 */

export interface MockChunk {
  product_name: string;
  product_family: string;
  chunk_text: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface EvalCase {
  name: string;
  query: string;
  /** All acceptable product names (at least one must appear in the response). */
  expectedProducts: string[];
  /** Products that MUST NOT be recommended as primary equivalent. */
  forbiddenProducts?: string[];
  chunks: MockChunk[];
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function chunk(
  product_name: string,
  product_family: string,
  chunk_text: string,
  similarity: number,
): MockChunk {
  return { product_name, product_family, chunk_text, similarity, metadata: {} };
}

// ─── Test cases ──────────────────────────────────────────────────────────────

export const EVAL_CASES: EvalCase[] = [
  // ── 1. Cimcool P80 ────────────────────────────────────────────────────────
  {
    name: "Cimcool P80 → fluide d'emmanchement (LUB 19)",
    query: 'cimcool P80',
    expectedProducts: ['LUB 19', 'LUB 13 EP2', 'LUB 13 M 1'],
    forbiddenProducts: ['HCB 300', 'HCB 400', 'SOLCUT'],
    chunks: [
      chunk(
        'HCB 300',
        'Huiles de coupe',
        "HCB 300 - Huile entière de coupe pour micro-pulvérisation (MQL). Base ester synthétique. Viscosité très faible adaptée à la lubrification par quantité minimale. Applications : tournage, fraisage, perçage haute vitesse. Ne convient pas aux opérations de montage ou d'emmanchement.",
        0.71,
      ),
      chunk(
        'HCB 400',
        'Huiles de coupe',
        "HCB 400 - Huile MQL haute performance, base ester, pour usinage à grande vitesse. Viscosité ISO 15. Aucune application d'emmanchement.",
        0.65,
      ),
      chunk(
        'LUB 19',
        "Fluides d'emmanchement",
        "LUB 19 - Fluide d'emmanchement aqueux pulvérisable. Application : facilite le montage et l'emmanchement de durites, joints, pièces en caoutchouc et élastomères sur embouts métalliques. Base aqueuse à tensioactifs. Biodégradable, sans silicone, sans huile minérale. Usage : industrie automobile, agroalimentaire, génie civil. Application par pulvérisation ou trempage. Produit de référence pour remplacer les fluides d'emmanchement aqueux concurrents type Cimcool.",
        0.58,
      ),
      chunk(
        'LUB 13 EP2',
        "Fluides d'emmanchement",
        "LUB 13 EP2 - Lubrifiant d'emmanchement EP pour montage à force de roulements, bagues, engrenages avec interférence élevée. Additifs extrême-pression. Haute viscosité. Résistance à l'eau. Pour opérations de montage difficiles nécessitant une lubrification EP.",
        0.54,
      ),
      chunk(
        'LUB 13 M 1',
        "Fluides d'emmanchement",
        "LUB 13 M 1 - Lubrifiant de montage universel. Applications : emmanchement de pièces mécaniques, joints, raccords. Facilite l'assemblage sans endommager les pièces.",
        0.51,
      ),
    ],
  },

  // ── 2. Klüber ISOFLEX NBU 15 → TGV 2000 ──────────────────────────────────
  {
    name: 'Klüber ISOFLEX NBU 15 → graisse haute vitesse (TGV 2000)',
    query: 'kluber isoflex nbu 15',
    expectedProducts: ['TGV 2000'],
    forbiddenProducts: ['NB 25', 'NB 1200', 'LUBA 501'],
    chunks: [
      chunk(
        'NB 25',
        'Graisses hautes performances',
        'NB 25 - Graisse au savon de lithium complexe. Bonne tenue en température jusqu\'à 130°C. Applications : roulements standard, moyeux, guides. Vitesses modérées. Pas adaptée aux très hautes vitesses.',
        0.72,
      ),
      chunk(
        'NB 25 NF',
        'Graisses hautes performances',
        'NB 25 NF - Version NSF H1 de la NB 25 pour industrie alimentaire. Savon de lithium complexe. Applications alimentaires à vitesses modérées.',
        0.68,
      ),
      chunk(
        'TGV 2000',
        'Graisses haute vitesse',
        'TGV 2000 - Graisse haute vitesse pour roulements à grande vitesse et brochage. Épaississant polyurée. Base huile synthétique (ester). Viscosité base huile ISO 15. Facteur de vitesse DN max : 1 800 000. Température : -40°C à +160°C. Applications : roulements de brochage, électrobroches, moteurs électriques haute vitesse, fuseaux. Homologué pour remplacer Klüber ISOFLEX NBU 15, SKF LGLT 2.',
        0.65,
      ),
      chunk(
        'LUBA 501',
        'Lubrifiants spéciaux',
        'LUBA 501 - Lubrifiant à chaîne longue durée. Pénétration élevée. Applications : chaînes de convoyeurs, mécanismes exposés.',
        0.52,
      ),
    ],
  },

  // ── 3. Klüber Paraliq P 68 → H 125 AL (+ filtre équipements) ─────────────
  {
    name: 'Klüber Paraliq P 68 → huile blanche NSF H1 (H 125 AL)',
    query: 'klüber paraliq P 68',
    expectedProducts: ['H 125 AL', 'H VG', 'USAGOL AL'],
    forbiddenProducts: ['PULSARLUBE M', 'PULSARLUBE E', 'KIT DE DISTRIBUTION', 'POMPE'],
    chunks: [
      // Note: PULSARLUBE chunks are excluded by the equipment filter before reaching the LLM.
      // We do NOT include them here to simulate post-filter results.
      chunk(
        'H 125 AL',
        'Huiles blanches alimentaires',
        'H 125 AL - Huile blanche minérale ISO VG 125 certifiée NSF H1 pour contact direct avec les aliments. Conforme FDA 21 CFR 178.3620. Application : lubrification de chaînes, engrenages, compresseurs en industrie alimentaire, pharmaceutique, cosmétique. Viscosité ISO 125. Équivalent direct Klüber Paraliq PA 125, Fuchs Paraliq BN 125.',
        0.67,
      ),
      chunk(
        'H VG',
        'Huiles végétales',
        'H VG - Huile base végétale biodégradable ISO VG 68. Pour lubrification en zone alimentaire ou environnementale sensible. Certification biodégradabilité OECD. Équivalent base végétale des huiles blanches minérales ISO 68.',
        0.61,
      ),
      chunk(
        'USAGOL AL',
        'Huiles blanches alimentaires',
        'USAGOL AL - Huile blanche minérale NSF H1 pour engrenages fermés en industrie alimentaire. Additifs EP. Certifiée contact alimentaire.',
        0.57,
      ),
      chunk(
        'HYDRO 68 AL',
        'Huiles hydrauliques alimentaires',
        'HYDRO 68 AL - Huile hydraulique NSF H1 ISO 68. Pour circuits hydrauliques en zone de contact alimentaire. Biodégradable.',
        0.53,
      ),
    ],
  },

  // ── 4. Bonderite L-FM L67 → MYE 607 AL (malgré MYE 950 mieux classé) ────
  {
    name: 'Bonderite L-FM L67 → vanishing oil alimentaire NSF H1 (MYE 607 AL / MYE 615 AL)',
    query: 'bonderite l-fm l67',
    expectedProducts: ['MYE 607 AL', 'MYE 615 AL'],
    forbiddenProducts: ['MYE 950'],
    chunks: [
      chunk(
        'MYE 950',
        'Huiles évaporantes',
        'MYE 950 - Huile évaporante haute performance pour emboutissage profond et découpage fin en industrie métallurgique et automobile. Évaporation rapide. Excellente lubrification sous pression élevée. Non certifié NSF H1. Usage : pièces métalliques non alimentaires.',
        0.78,
      ),
      chunk(
        'MYE 845',
        'Huiles évaporantes',
        'MYE 845 - Huile évaporante pour emboutissage de pièces en acier inoxydable et aluminium. Non alimentaire.',
        0.72,
      ),
      chunk(
        'MYE 716',
        'Huiles évaporantes',
        'MYE 716 - Huile évaporante industrielle. Base minérale. Évaporation moyenne. Non certifiée NSF H1.',
        0.69,
      ),
      chunk(
        'MYE 615 AL',
        'Huiles évaporantes alimentaires',
        'MYE 615 AL - Huile évaporante certifiée NSF H1 pour industries alimentaires et conditionnement. Base synthétique ester. Évaporation complète sans résidu. Application : emboutissage léger, découpage, pliage de pièces métalliques en contact direct avec les aliments. Certifié USDA/NSF H1. Équivalent Bonderite L-FM pour contact alimentaire.',
        0.65,
      ),
      chunk(
        'MYE 607 AL',
        'Huiles évaporantes alimentaires',
        'MYE 607 AL - Huile évaporante NSF H1 pour applications agroalimentaires. Synthétique ester, évaporation rapide et complète, aucun résidu sur la pièce. Pour opérations de découpage et emboutissage léger sur ligne de production alimentaire. Homologué NSF H1.',
        0.63,
      ),
      chunk(
        'MYE 603',
        'Huiles évaporantes',
        'MYE 603 - Huile évaporante légère, usage général. Non alimentaire.',
        0.59,
      ),
    ],
  },

  // ── 5. RENOFORM DSW 1002 → SOLESTER 77 (+ mention SOLESTER 600) ───────────
  {
    name: 'RENOFORM DSW 1002 → fluide de déformation synthétique (SOLESTER 77 / SOLESTER 600)',
    query: 'RENOFORM DSW 1002',
    expectedProducts: ['SOLESTER 77', 'SOLESTER 600'],
    chunks: [
      chunk(
        'SOLESTER 77',
        'Huiles de déformation',
        'SOLESTER 77 - Fluide aqueux synthétique prêt à l\'emploi pour déformation à froid, emboutissage léger et découpage. Base ester synthétique. Sans dilution nécessaire. Compatible avec acier, aluminium, inox. Biodégradable. Correspond aux fluides aqueux synthétiques prêts à l\'emploi type Fuchs RENOFORM DSW.',
        0.74,
      ),
      chunk(
        'SOLESTER 600',
        'Huiles de déformation',
        'SOLESTER 600 - Fluide synthétique concentré haute performance pour emboutissage et déformation à froid sévère. Dilution avec eau selon sévérité. Excellente résistance à la pression. Compatible acier haute résistance, aluminium. Plus polyvalent que SOLESTER 77 pour applications exigeantes.',
        0.68,
      ),
      chunk(
        'SOLESTER 540',
        'Huiles de déformation',
        'SOLESTER 540 - Huile entière de déformation. Non soluble dans l\'eau. Pour découpage et emboutissage profond.',
        0.60,
      ),
      chunk(
        'SOLESTER 530 M',
        'Huiles de déformation',
        'SOLESTER 530 M - Huile entière de déformation pour aciers spéciaux et inox. Haute performance EP.',
        0.55,
      ),
    ],
  },
];
