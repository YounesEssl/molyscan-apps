jest.mock('@/lib/axios', () => ({ api: { get: jest.fn() } }), { virtual: true });
jest.mock('@/constants/api', () => ({ ENDPOINTS: { features: '/features' } }), { virtual: true });
jest.mock('@/schemas/features.schema', () => require('../schemas/features.schema'), { virtual: true });
jest.mock('@/services/features.service', () => require('../services/features.service'), { virtual: true });

import { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { featuresService } from '../services/features.service';
import { featuresQueryKey, featuresQueryOptions, refreshFeatures } from './features';

describe('remote feature availability', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.resetAllMocks();
    client = new QueryClient();
  });
  afterEach(() => client.clear());

  it('defaults to disabled without a signed-in user and performs no request', async () => {
    expect(featuresQueryOptions(undefined).enabled).toBe(false);
    await expect(refreshFeatures(client, undefined)).resolves.toEqual({ crmHistoryEditingEnabled: false });
    expect(api.get).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses the explicit server value %s', async (enabled) => {
    (api.get as jest.Mock).mockResolvedValue({ data: { crmHistoryEditingEnabled: enabled } });
    await expect(refreshFeatures(client, 'user-1')).resolves.toEqual({ crmHistoryEditingEnabled: enabled });
    expect(api.get).toHaveBeenCalledWith('/features', { signal: expect.any(AbortSignal) });
  });

  it.each([{}, null, { crmHistoryEditingEnabled: 'true' }, { crmHistoryEditingEnabled: 1 }])(
    'never enables from a missing or invalid value: %j', async (data) => {
      (api.get as jest.Mock).mockResolvedValue({ data });
      await expect(featuresService.get()).resolves.toEqual({ crmHistoryEditingEnabled: false });
    },
  );

  it('rechecks the server rather than reusing an earlier off value after activation', async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: { crmHistoryEditingEnabled: false } })
      .mockResolvedValueOnce({ data: { crmHistoryEditingEnabled: true } });
    await refreshFeatures(client, 'user-1');
    await expect(refreshFeatures(client, 'user-1')).resolves.toEqual({ crmHistoryEditingEnabled: true });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it.each(['revoked', 'offline'])('removes the cached grant when %s', async (reason) => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { crmHistoryEditingEnabled: true } });
    await refreshFeatures(client, 'user-1');
    expect(client.getQueryData(featuresQueryKey('user-1'))).toEqual({ crmHistoryEditingEnabled: true });
    if (reason === 'offline') (api.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    else (api.get as jest.Mock).mockResolvedValueOnce({ data: { crmHistoryEditingEnabled: false } });
    await expect(refreshFeatures(client, 'user-1')).resolves.toEqual({ crmHistoryEditingEnabled: false });
    expect(client.getQueryData(featuresQueryKey('user-1'))).toEqual({ crmHistoryEditingEnabled: false });
  });

  it('keeps availability scoped to the authenticated user', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { crmHistoryEditingEnabled: true } });
    await refreshFeatures(client, 'user-1');
    expect(client.getQueryData(featuresQueryKey('user-2'))).toBeUndefined();
  });
});
