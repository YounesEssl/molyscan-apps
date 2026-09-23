import { loadPimAvailability, normalizePimProductName, PimAvailability } from '../pim-availability';

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

  it('withdraws discontinued reference codes without withdrawing their still-active parent product', () => {
    const current = new PimAvailability([{ name: 'AIR S22 AL', active: true, references: [
      { code: 'AIR22-OLD', active: false }, { code: 'AIR22-NEW', active: true },
    ] }]);
    expect(current.isInactive('AIR S22 AL')).toBe(false);
    expect(current.isInactiveReference('AIR22-OLD')).toBe(true);
    expect(current.isInactiveReference('AIR22-NEW')).toBe(false);
    expect(current.isInactiveReference('UNKNOWN')).toBe(false);
    expect(current.isInactiveReference(null)).toBe(false);
    expect(current.mentionsInactive('AIR S22 AL — réf. AIR22-OLD, bidon 25 L')).toBe(true);
    expect(current.mentionsInactive('AIR S22 AL — AIR22-NEW')).toBe(false);
  });

  it('treats a reference of an inactive parent as unavailable even if its own flag is stale', () => {
    const current = new PimAvailability([{ name: 'OLD', active: false, references: [{ code: 'OLD25L', active: true }] }]);
    expect(current.isInactiveReference('OLD25L')).toBe(true);
  });

  it('preserves active duplicate codes and distinguishes reference + grades', () => {
    const current = new PimAvailability([
      { name: 'Retired', active: false, references: [{ code: 'SHARED', active: false }] },
      { name: 'Current', active: true, references: [
        { code: 'SHARED', active: true }, { code: 'REF', active: false }, { code: 'REF+', active: true },
      ] },
    ]);
    expect(current.isInactiveReference('SHARED')).toBe(false);
    expect(current.isInactiveReference('REF')).toBe(true);
    expect(current.isInactiveReference('REF +')).toBe(false);
    expect(current.mentionsInactive('REF+')).toBe(false);
    expect(current.mentionsInactive('REF ou REF+')).toBe(true);
  });

  it('keeps an active product name that collides with an inactive code while rejecting the explicit code field', () => {
    const current = new PimAvailability([{ name: 'KL BIO', active: true, references: [{ code: 'KL BIO', active: false }] }]);
    expect(current.isInactive('KL BIO')).toBe(false);
    expect(current.isInactiveReference('KL BIO')).toBe(true);
    expect(current.mentionsInactive('Le produit KL BIO convient.')).toBe(false);
  });

  it('withdraws stale reference recommendations only in the model context, keeping stored messages unchanged', () => {
    const current = new PimAvailability([{ name: 'Current', active: true, references: [{ code: 'CODE25L', active: false }] }]);
    const history = [{ role: 'user', text: 'CODE25L ?' }, { role: 'assistant', text: 'Current existe en CODE25L, bidon 25 L.' }];
    expect(current.sanitizeHistory(history)).toEqual([
      history[0], expect.objectContaining({ text: expect.stringContaining('recommendation withdrawn') }),
    ]);
    expect(history[1].text).toBe('Current existe en CODE25L, bidon 25 L.');
  });

  it('loads both active and inactive reference codes along with their parent availability', async () => {
    const prisma = { pimProduct: { findMany: jest.fn().mockResolvedValue([{ name: 'Current', active: true,
      references: [{ code: 'OLD25L', active: false }] }]) } };
    const current = await loadPimAvailability(prisma as any);
    expect(prisma.pimProduct.findMany).toHaveBeenCalledWith({ select: {
      name: true, active: true, references: { select: { code: true, active: true } },
    } });
    expect(current.isInactiveReference('OLD25L')).toBe(true);
  });
});
