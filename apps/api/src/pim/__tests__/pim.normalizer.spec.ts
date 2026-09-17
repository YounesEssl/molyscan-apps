import { buildChunk, detectProductType, documents, hash, mergeData, numberValue, productCertifications } from '../pim.normalizer';

describe('PIM normalizer', () => {
  it('maps verified Sellbase SDS characteristics and preserves actual media paths', () => {
    const result = documents({
      '39': { id: 1, id_element: 1, id_valeur: 39, contenu: 'a/ag/AGL_41_FDS_FR.pdf', id_langue: 0 },
      '1046': { id: 2, id_element: 1, id_valeur: 1046, contenu: 'AGL_41_FDS_GB.pdf', id_langue: 0 },
      '364': { id: 3, id_element: 1, id_valeur: 364, contenu: ' ', id_langue: 0 },
    });
    expect(result).toEqual([
      expect.objectContaining({ kind: 'safety_sheet', language: 'fr', fileName: 'a/ag/AGL_41_FDS_FR.pdf' }),
      expect.objectContaining({ kind: 'safety_sheet', language: 'en', fileName: 'AGL_41_FDS_GB.pdf' }),
    ]);
  });
  it('hashes canonical objects independently of key order', () => {
    expect(hash({ b: 2, a: { d: 4, c: 3 } })).toBe(hash({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it('applies publication overrides on top of master data', () => {
    expect(mergeData({ '15': { id: 1, id_element: 1, id_valeur: 15, contenu: 'Master', id_langue: 0 } }, { '15': { id: 2, id_element: 1, id_valeur: 15, contenu: 'Web', id_langue: 0 } })['15'].contenu).toBe('Web');
  });

  it('parses localized numeric values', () => {
    expect(numberValue({ '26': { id: 1, id_element: 1, id_valeur: 26, contenu: '211,5 cSt', id_langue: 0 } }, 26)).toBe(211.5);
  });

  it('keeps equipment out of the lubricant catalog', () => {
    expect(detectProductType('POMPE MANUELLE', 'Matériel de graissage')).toBe('equipment');
    expect(detectProductType('AGL 41 NF', 'Graisses')).toBe('lubricant');
  });

  it('builds a deterministic evidence-only product document', () => {
    const content = buildChunk({ name: 'AGL 41 NF', family: 'Graisses', subfamily: null, shortDescription: null, description: 'Graisse pulvérisable', usage: 'Engrenages ouverts', baseOil: 'Minérale', thickener: 'Al X', nlgiGrade: '0', viscosity40: null, baseOilViscosity40: null, temperatureMin: -20, temperatureMax: 140, dropPoint: null, dinClassification: null, isoClassification: null, foodGrade: false, ecoResponsible: false, moshMoahFree: false, references: [{ code: 'AGL41NF1FT', packaging: 'FUT' }] });
    expect(content).toContain('Product: AGL 41 NF');
    expect(content).toContain('Applications and uses: Engrenages ouverts');
    expect(content).toContain('References: AGL41NF1FT — FUT');
  });
});

describe('Explicit PIM certification evidence', () => {
  const data = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).map(([id, contenu]) => [id, { id: Number(id), id_element: 1, id_valeur: Number(id), contenu, id_langue: 0 }]));

  it.each(['GR PTFE AL', 'AGL 75 AL', 'FILLMORE AL'])('recognizes the actual H1 logo used by %s', () => {
    expect(productCertifications(data({ '1373': 'n/nf/NFC_Mark_H1_BLUE.jpg' })))
      .toMatchObject({ foodGrade: true, nsfCategories: ['H1'], certifications: [{ issuer: 'NSF', category: 'H1', sourceCaracId: 1373 }] });
  });
  it('keeps KL 9 H NSF A1 distinct from H1 and uses its explicit catalogue eco label', () => {
    expect(productCertifications(data({ '1373': 'n/nf/NFC_Mark_A1_BLUE.jpg', '16': 'Nettoyant dégraissant écoresponsable, en phase aqueuse', '1374': 'm/mo/MOSH_MOAH_FREE_molydal_logo.jpg' })))
      .toMatchObject({ foodGrade: false, nsfCategories: ['A1'], ecoResponsible: true, moshMoahFree: true });
  });
  it('keeps NSF 3H and K1 distinct and recognizes a combined H1/3H logo', () => {
    expect(productCertifications(data({ '1373': 'n/nf/NFC_Mark_3H_BLUE.jpg' }))).toMatchObject({ foodGrade: false, nsfCategories: ['3H'] });
    expect(productCertifications(data({ '1373': 'n/nf/NFC_Mark_K1_BLUE.jpg' }))).toMatchObject({ foodGrade: false, nsfCategories: ['K1'] });
    expect(productCertifications(data({ '1373': 'n/ns/NSF_Mark_H1_3H_BLUE.jpg' }))).toMatchObject({ foodGrade: true, nsfCategories: ['3H', 'H1'] });
  });
  it('extracts an explicit NSF category from the official description', () => {
    expect(productCertifications(data({ '18': 'GR PTFE AL est enregistrée par le NSF International, dans la catégorie H1. (N°163619)' })))
      .toMatchObject({ foodGrade: true, nsfCategories: ['H1'] });
  });
  it('keeps explicit 2probity H1 separate from NSF H1', () => {
    expect(productCertifications(data({ '18': 'Homologuée par 2probity.eu, dans la catégorie H1 Registration CA1824301.' })))
      .toMatchObject({ foodGrade: true, nsfCategories: [], certifications: [{ issuer: '2probity', category: 'H1', sourceCaracId: 18 }] });
  });
  it('does not combine two certificate issuers in one sentence', () => {
    const result = productCertifications(data({ '18': 'Certifié 2probity H1 et NSF A1.' }));
    expect(result.nsfCategories).toEqual(['A1']);
    expect(result.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ issuer: '2probity', category: 'H1' }),
      expect.objectContaining({ issuer: 'NSF', category: 'A1' }),
    ]));
  });
  it('prefers the canonical French issuer over a stale English translation', () => {
    const result = productCertifications(data({ '18': 'Homologué 2probity H1.', '130': 'NSF H1 registered.' }));
    expect(result.nsfCategories).toEqual([]);
    expect(result.certifications).toHaveLength(1);
  });
  it.each([
    { '18': 'Pour industries alimentaires, contact fortuit avec les aliments.' },
    { '1373': 'n/ns/NSF Mark.jpg' },
    { '47': '163619' },
    { '1124': 'certificat_alimentaire.pdf' },
    { '1380': 'M/MY/MYE_607_AL_2probity-certificate-DA2524303-colour.png' },
    { '18': 'Une application qui exige une certification NSF H1.' },
  ] as Array<Record<string, string>> )('does not infer H1 from vague claims, registration numbers or generic logos: %j', (values) => {
    expect(productCertifications(data(values))).toMatchObject({ foodGrade: false, nsfCategories: [] });
  });
  it.each(['Non homologué NSF H1.', 'Not NSF H1 certified.', 'Sans certification NSF H1.', 'NSF H1 : certification en attente.', 'NSF H1 non certifié.'])('rejects negative/pending certification: %s', (description) => {
    expect(productCertifications(data({ '18': description, '1373': 'n/nf/NFC_Mark_H1_BLUE.jpg' }))).toMatchObject({ foodGrade: false, nsfCategories: [] });
  });
  it('does not turn a negative H1 mention into the class of an A1 cleaner', () => {
    expect(productCertifications(data({ '18': 'Certifié NSF A1, non H1.' }))).toMatchObject({ foodGrade: false, nsfCategories: ['A1'] });
  });
  it('does not assign a later mentioned lubricant category to an NSF A1 cleaner', () => {
    expect(productCertifications(data({ '18': 'Nettoyant certifié NSF A1 pour éliminer les lubrifiants H1.' }))).toMatchObject({ foodGrade: false, nsfCategories: ['A1'] });
  });
  it('uses dedicated BioPreferred metadata and ignores an evocative product name', () => {
    expect(productCertifications(data({ '1376': 'h/hv/HVG_BioPreferredLabel.jpg' })).ecoResponsible).toBe(true);
    expect(productCertifications(data({ '15': 'KL BIO', '18': 'Nettoyant pour surfaces.' })).ecoResponsible).toBe(false);
    expect(productCertifications(data({ '16': 'Produit non écoresponsable', '1376': 'BioPreferredLabel.jpg' })).ecoResponsible).toBe(false);
  });
});
