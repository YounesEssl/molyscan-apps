import { ConfigService } from '@nestjs/config';
import { SellbaseClient } from '../sellbase.client';

describe('Sellbase catalogue scope', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ elements: [], caracs: {} }), {
        headers: { 'content-type': 'application/json' },
      }),
    ));
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function client(values: Record<string, string> = {}) {
    const sellbase = new SellbaseClient(new ConfigService({
      SELLBASE_API_URL: 'https://sellapi.example.test',
      SELLBASE_SERVER: 'base05',
      SELLBASE_BASE: 'c_molydal',
      ...values,
    }));
    jest.spyOn(sellbase as any, 'authenticate').mockResolvedValue('private-test-token');
    return sellbase;
  }

  it('reads the complete master catalogue by default', async () => {
    const sellbase = client();

    await sellbase.getElements(4);
    await sellbase.getCharacteristics();

    expect(sellbase.catalogBaseId).toBe(0);
    expect(fetchMock.mock.calls[0][0]).toContain('/element/getByLevel?baseId=0&level=4');
    expect(fetchMock.mock.calls[1][0]).toContain('/carac/getAll?baseId=0');
  });

  it('can still be explicitly restricted to a publication', async () => {
    const sellbase = client({ SELLBASE_CATALOG_BASE_ID: '52903' });

    await sellbase.getElements(5);

    expect(sellbase.catalogBaseId).toBe(52903);
    expect(fetchMock.mock.calls[0][0]).toContain('/element/getByLevel?baseId=52903&level=5');
  });

  it('reads every page when the master catalogue exceeds the API page size', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        elements: Array.from({ length: 1000 }, (_, id) => ({ id })),
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [{ id: 1000 }] })));
    const sellbase = client();

    const elements = await sellbase.getElements(5);

    expect(elements).toHaveLength(1001);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('page=0');
    expect(fetchMock.mock.calls[1][0]).toContain('page=1');
  });

  it.each(['-1', 'not-a-number', '1.5'])('rejects an invalid catalogue scope: %s', (value) => {
    const sellbase = client({ SELLBASE_CATALOG_BASE_ID: value });

    expect(() => sellbase.catalogBaseId).toThrow('SELLBASE_CATALOG_BASE_ID');
  });

  it('always excludes Molydal archives, supports extra folders, and isolates other tenants', () => {
    expect(client().excludedFolderIds).toEqual([25012891]);
    expect(client({ SELLBASE_EXCLUDED_FOLDER_IDS: '44, 25012891,55' }).excludedFolderIds).toEqual([25012891, 44, 55]);
    expect(client({ SELLBASE_BASE: 'c_other' }).excludedFolderIds).toEqual([]);
    expect(client({ SELLBASE_BASE: 'c_other', SELLBASE_EXCLUDED_FOLDER_IDS: '44' }).excludedFolderIds).toEqual([44]);
  });

  it.each(['0', '-1', '1.5', '44,', 'archive', '9007199254740992'])('rejects malformed exclusion IDs: %s', (value) => {
    expect(() => client({ SELLBASE_EXCLUDED_FOLDER_IDS: value }).excludedFolderIds).toThrow('SELLBASE_EXCLUDED_FOLDER_IDS');
  });

  it('can read master archive membership independently of the selected publication', async () => {
    await client({ SELLBASE_CATALOG_BASE_ID: '52903' }).getElements(4, 0);
    expect(fetchMock.mock.calls[0][0]).toContain('/element/getByLevel?baseId=0&level=4');
  });
});
