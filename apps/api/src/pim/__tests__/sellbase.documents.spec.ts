import { ConfigService } from '@nestjs/config';
import { SellbaseClient } from '../sellbase.client';

describe('Sellbase document sources', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(new Response('%PDF-1.7\nfixture'));
    global.fetch = fetchMock;
  });
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  function client(values: Record<string, string | undefined> = {}) {
    const sellbase = new SellbaseClient(new ConfigService(values));
    const authenticate = jest.spyOn(sellbase as any, 'authenticate').mockResolvedValue('private-test-token');
    return { sellbase, authenticate };
  }

  it.each([
    ['AGL_41_NF_FDS_FR.pdf', 'a/ag/AGL_41_NF_FDS_FR.pdf'],
    ['AGL_41_NF_FDS_GB.pdf', 'a/ag/AGL_41_NF_FDS_GB.pdf'],
    ['BLACK_SEAL_FDS_FR.pdf', 'b/bl/BLACK_SEAL_FDS_FR.pdf'],
    ['a/ag/AGL_41_NF_FDS_FR.pdf', 'a/ag/AGL_41_NF_FDS_FR.pdf'],
    ['K/KL/KL_420_FDS_FR.pdf', 'k/kl/KL_420_FDS_FR.pdf'],
    ['A/AD/ADS_530_FDS_FR.pdf', 'a/ad/ADS_530_FDS_FR.pdf'],
    ['A/AD/ADS_530_FDS_GB.pdf', 'a/ad/ADS_530_FDS_GB.pdf'],
    ['T/TO/TOP_LUB_-_aérosol_FDS_GB.pdf', 't/to/TOP_LUB_-_a%C3%A9rosol_FDS_GB.pdf'],
    ['AGL 41 NF FDS FR.pdf', 'a/ag/AGL%2041%20NF%20FDS%20FR.pdf'],
  ])('uses the verified public archive for %s without credentials', async (fileName, path) => {
    const { sellbase, authenticate } = client();
    expect(sellbase.canDownloadDocument('safety_sheet')).toBe(true);
    await sellbase.downloadDocument(fileName, { kind: 'safety_sheet', language: 'fr' });
    expect(fetchMock).toHaveBeenCalledWith(`https://static.sellbase-plateforme.com/molydal/molydal/${path}`,
      expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }));
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('keeps the FT product endpoint and language without authenticating to Sellbase', async () => {
    const { sellbase, authenticate } = client();
    expect(sellbase.canDownloadDocument('technical_sheet', 70322)).toBe(true);
    await sellbase.downloadDocument('AGL_41_NF_FT_GB.pdf', { kind: 'technical_sheet', language: 'en', productInstanceId: 70322 });
    expect(fetchMock).toHaveBeenCalledWith('https://www.molydal.com/en/produit/70322/fiche-technique',
      expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('preserves a configured authenticated media source and its relative paths', async () => {
    const { sellbase, authenticate } = client({ SELLBASE_MEDIA_BASE_URL: 'https://media.example.test/files/' });
    await sellbase.downloadDocument('folder/FDS FR.pdf', { kind: 'safety_sheet' });
    expect(fetchMock).toHaveBeenCalledWith('https://media.example.test/files/folder/FDS%20FR.pdf',
      expect.objectContaining({ headers: { authorization: 'Bearer private-test-token' }, redirect: 'error' }));
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('does not silently use the Molydal archive for other tenants or document types', async () => {
    const { sellbase } = client({ SELLBASE_BASE: 'c_other' });
    expect(sellbase.canDownloadDocument('safety_sheet')).toBe(false);
    await expect(sellbase.downloadDocument('AGL_41_NF_FDS_FR.pdf', { kind: 'safety_sheet' })).rejects.toThrow('not configured');
    const molydal = client().sellbase;
    expect(molydal.canDownloadDocument('certificate')).toBe(false);
    expect(molydal.canDownloadDocument('technical_sheet')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    '../private.pdf', 'a/../../private.pdf', '/private.pdf', '//other.test/file.pdf',
    'https://other.test/file.pdf', 'file:///private.pdf', 'a\\..\\private.pdf',
    '%2e%2e/private.pdf', '%252e%252e/private.pdf', 'a%2fb/file.pdf',
    'folder//file.pdf', 'file\nname.pdf', '',
  ])('rejects untrusted paths before authentication or fetching: %j', async (fileName) => {
    for (const config of [{}, { SELLBASE_MEDIA_BASE_URL: 'https://media.example.test/files' }]) {
      const { sellbase, authenticate } = client(config);
      await expect(sellbase.downloadDocument(fileName, { kind: 'safety_sheet' })).rejects.toThrow('Invalid Sellbase document path');
      expect(authenticate).not.toHaveBeenCalled();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
