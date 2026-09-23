import { normalizePimProductName, PimAvailability } from '../pim-availability';

describe('Current PIM product availability', () => {
  const availability = new PimAvailability([
    { name: 'STARNET', active: false }, { name: 'STARNET+', active: true },
    { name: 'KL BIO', active: false }, { name: 'KL BIO', active: true },
    { name: 'ABC', active: false }, { name: 'ABC AL', active: true },
  ]);
  it('blocks only known inactive exact names, preserving homonyms, unknowns and + grades', () => {
    expect(availability.isInactive('stárnet')).toBe(true);
    expect(availability.isInactive('STARNET +')).toBe(false);
    expect(availability.isInactive('KL-BIO')).toBe(false);
    expect(availability.isInactive('unknown product')).toBe(false);
    expect(availability.isInactive('STARNET SPECIAL')).toBe(false);
    expect(normalizePimProductName('STARNET +')).toBe('starnet+');
  });
  it.each(['STARNET+ convient.', 'STARNET + convient.', 'ABC AL convient.', 'KL BIO convient.'])('does not match an archived base inside the active grade: %s', (text) => {
    expect(availability.mentionsInactive(text)).toBe(false);
  });
  it.each(['STARNET ou STARNET+', 'ABC ou ABC AL', 'ABC AL puis ABC', 'ABC AL, ABC AL et ABC'])('detects separate archived occurrences alongside active grades: %s', (text) => {
    expect(availability.mentionsInactive(text)).toBe(true);
  });
  it('sanitizes old assistant context in memory without rewriting history or user questions', () => {
    const original = [{ role: 'user', text: 'STARNET ?' }, { role: 'assistant', text: 'Je propose STARNET.' }, { role: 'assistant', text: 'STARNET+ reste disponible.' }];
    const safe = availability.sanitizeHistory(original);
    expect(safe[0].text).toBe('STARNET ?');
    expect(safe[1].text).toContain('recommendation withdrawn');
    expect(safe[2].text).toBe(original[2].text);
    expect(original[1].text).toBe('Je propose STARNET.');
  });
});
