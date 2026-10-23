import { PimAvailability } from '../../pim/pim-availability';
import { comparisonInstruction, comparisonLanguageInstruction, isTechnicalComparison, selectComparisonProducts, verifiedSearchCitations, verifiedSearchEvidence } from './comparison-policy';

describe('Factual comparison scope', () => {
  const availability = new PimAvailability([
    { name: 'PERF 80', active: false }, { name: 'PERF 80 NF', active: true },
    { name: 'PERF 83', active: true }, { name: 'TEFLUB', active: true },
    { name: 'AGL 65 AL', active: true }, { name: 'LCH 700', active: true },
  ]);
  const scanned = ['PERF 80 NF'];

  test.each([
    'Fais-moi un tableau comparatif du Bardal HP Dry avec le Perf 80.',
    'Compare Bardahl HP DRY et PERF80',
    'Compare le PERF 80 avec le Bardahl HP DRY',
    'Give me a comparison table of Bardahl HP Dry and Perf 80',
  ])('resolves a contextual abbreviation to the full scanned designation: %s', (question) => {
    expect(selectComparisonProducts(question, [], availability, scanned)).toEqual({
      names: ['PERF 80 NF'], aliases: [{ mentionedAs: 'PERF 80', name: 'PERF 80 NF' }],
    });
  });
  test.each(['PERF 800', 'PERF 80 AL', 'ancien PERF 80', 'PERF 80 sans NF', 'PERF 81'])('does not turn a different/archived grade into the current scanned product: %s', (grade) => {
    expect(selectComparisonProducts(`Compare ${grade}`, [], availability, scanned).names).toEqual([]);
  });
  test('does not use a global alias for the archived base outside this scan', () => {
    expect(selectComparisonProducts('Compare HP Dry et PERF 80', [], availability, []).names).toEqual([]);
  });
  test('does not choose between multiple variants of the same abbreviated base', () => {
    const variants = new PimAvailability([{ name: 'PERF 80 NF', active: true }, { name: 'PERF 80 AL', active: true }]);
    expect(selectComparisonProducts('Compare PERF 80', [], variants, ['PERF 80 NF', 'PERF 80 AL']).names).toEqual([]);
  });
  test('keeps explicitly requested products rather than the expert equivalent or scan', () => {
    expect(selectComparisonProducts('Compare HP Dry avec PERF 83', [], availability, scanned).names).toEqual(['PERF 83']);
  });
  test('retains every product in an explicit multi-product comparison', () => {
    expect(selectComparisonProducts('Compare PERF 83 et PERF 80', [], availability, scanned).names).toEqual(['PERF 83', 'PERF 80 NF']);
  });
  test('pins products from the last result for a contextual follow-up', () => {
    expect(selectComparisonProducts('Fais un tableau comparatif des résultats', [
      { role: 'assistant', text: 'Voici AGL 65 AL et LCH 700.' },
    ], availability, []).names).toEqual(['AGL 65 AL', 'LCH 700']);
  });
  test('uses the scan before the first assistant reply', () => {
    expect(selectComparisonProducts('Fais un tableau comparatif des résultats', [], availability, scanned).names).toEqual(scanned);
  });
  test('does not let a previous erroneous shortlist override the current named pair', () => {
    expect(selectComparisonProducts('Compare HP Dry avec Perf 80', [
      { role: 'assistant', text: 'Je compare PERF 83 et TEFLUB.' },
    ], availability, scanned).names).toEqual(scanned);
  });
  test.each(['Compare les deux', 'Un tableau des équivalents', 'Vergleich der beiden Produkte', 'A comparison table'])('recognizes a comparison request: %s', (question) => {
    expect(isTechnicalComparison(question)).toBe(true);
  });
  test('explicitly allows factual competitor comparisons and forbids unsolicited alternatives', () => {
    const instruction = comparisonInstruction({ names: scanned, aliases: [] });
    expect(instruction).toContain('Do not refuse');
    expect(instruction).toContain('Do not replace any requested product');
    expect(instruction).toContain('Missing data for a column must not prevent the table');
    expect(instruction).toContain('PERF 80 NF');
  });
  test('rejects purported citations without actual attributed search claims', () => {
    expect(verifiedSearchEvidence(undefined)).toBe('');
    expect(verifiedSearchEvidence({ groundingChunks: [{ web: { uri: 'https://example.com' } }] })).toBe('');
    expect(verifiedSearchEvidence({ groundingSupports: [{ segment: { text: 'NSF H1 and -35 to 270 degrees' }, groundingChunkIndices: [0] }] })).toBe('');
  });
  test('keeps only attributed claims linked to real search results', () => {
    const verified = verifiedSearchEvidence({
      groundingChunks: [{ web: { uri: 'https://source.example/ft' } }],
      groundingSupports: [
        { segment: { text: 'Verified application from the technical sheet.' }, groundingChunkIndices: [0] },
        { segment: { text: 'Invented certification with no source.' }, groundingChunkIndices: [4] },
      ],
    });
    expect(verified).toContain('Verified application');
    expect(verified).toContain('https://source.example/ft');
    expect(verified).not.toContain('Invented');
  });
  test('only appends citations actually used by attributed claims', () => {
    const citations = verifiedSearchCitations({
      groundingChunks: [
        { web: { uri: 'https://source.example/ft', title: 'Manufacturer' } },
        { web: { uri: 'https://unrelated.example', title: 'Unrelated' } },
      ],
      groundingSupports: [{ segment: { text: 'Verified application from the technical sheet.' }, groundingChunkIndices: [0] }],
    });
    expect(citations).toContain('[Manufacturer](https://source.example/ft)');
    expect(citations).not.toContain('Unrelated');
    expect(verifiedSearchCitations({ groundingChunks: [{ web: { uri: 'https://unrelated.example' } }] })).toBe('');
  });
  test('keeps the requested language despite French expert notes', () => {
    expect(comparisonLanguageInstruction('Give me a comparison table')).toContain('in English');
    expect(comparisonLanguageInstruction('Fais-moi un tableau comparatif')).toContain('in French');
  });
});
