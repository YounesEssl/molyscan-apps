import { erpReferenceStatus } from '../pim-erp-status';

describe('ERP1393 reference status parsing', () => {
  const parse = (value: unknown, language = 0) => erpReferenceStatus({ '1393': { contenu: value, id_langue: language } } as any);
  it.each(['0', ' 0 ', 0])('accepts only explicit numeric0 as active: %j', (value) => {
    expect(parse(value)).toEqual({ state: 'active', value: '0' });
  });
  it.each(['1', ' 1 ', 1])('recognizes explicit1 as sleeping: %j', (value) => {
    expect(parse(value)).toEqual({ state: 'sleeping', value: '1' });
  });
  it.each([undefined, null, '', '   '])('keeps absent/empty values unavailable: %j', (value) => {
    expect(parse(value)).toEqual({ state: 'missing', value: null });
  });
  it.each([false, true, 'false', 'true', 'actif', '0.0', '-1', '2', [], {}])('does not turn invalid/truthy values into availability: %j', (value) => {
    expect(parse(value).state).toBe('invalid');
  });
  it('accepts the real legacy language1 case from the master without inventing absent metadata', () => {
    expect(parse('0', 1).state).toBe('active');
    expect(erpReferenceStatus()).toEqual({ state: 'missing', value: null });
  });
});
