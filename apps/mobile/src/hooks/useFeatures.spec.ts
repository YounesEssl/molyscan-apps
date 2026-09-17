const mockEffects: Array<() => void | (() => void)> = [];
let mockFocus: () => void;
let mockAppState: (state: string) => void;
let mockNetwork: (state: { isConnected: boolean | null }) => void;
const mockRemoveAppState = jest.fn();
const mockRemoveNetwork = jest.fn();
const mockUseQuery = jest.fn();
let mockClient: import('@tanstack/react-query').QueryClient;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { mockEffects.push(effect); },
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: (_event: string, listener: typeof mockAppState) => {
    mockAppState = listener;
    return { remove: mockRemoveAppState };
  } },
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (listener: typeof mockNetwork) => {
    mockNetwork = listener;
    return mockRemoveNetwork;
  },
}));
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => { mockFocus = callback; } }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockClient,
}));
jest.mock('@/stores/auth.store', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'user-1' } }) }), { virtual: true });
jest.mock('@/lib/features', () => require('../lib/features'), { virtual: true });
jest.mock('@/schemas/features.schema', () => require('../schemas/features.schema'), { virtual: true });
jest.mock('@/services/features.service', () => ({ featuresService: { get: jest.fn() } }), { virtual: true });

import { QueryClient } from '@tanstack/react-query';
import { featuresService } from '@/services/features.service';
import { featuresQueryKey } from '../lib/features';
import { useFeatures } from './useFeatures';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('feature refresh lifecycle', () => {
  let cleanup: () => void;

  beforeEach(() => {
    jest.resetAllMocks();
    mockEffects.length = 0;
    mockClient = new QueryClient();
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true, isError: false });
    (featuresService.get as jest.Mock).mockResolvedValue({ crmHistoryEditingEnabled: true });
    useFeatures();
    cleanup = mockEffects[0]() as () => void;
  });
  afterEach(() => {
    cleanup();
    mockClient.clear();
  });

  it('refreshes on screen focus, app foreground and network reconnection', async () => {
    mockFocus();
    await settle();
    expect(featuresService.get).toHaveBeenCalledTimes(1);
    mockAppState('background');
    await settle();
    expect(featuresService.get).toHaveBeenCalledTimes(1);
    mockAppState('active');
    await settle();
    expect(featuresService.get).toHaveBeenCalledTimes(2);
    mockNetwork({ isConnected: true });
    await settle();
    expect(featuresService.get).toHaveBeenCalledTimes(3);
    mockNetwork({ isConnected: false });
    await settle();
    expect(mockClient.getQueryData(featuresQueryKey('user-1'))).toEqual({ crmHistoryEditingEnabled: false });
    mockNetwork({ isConnected: true });
    await settle();
    expect(featuresService.get).toHaveBeenCalledTimes(4);
    expect(mockClient.getQueryData(featuresQueryKey('user-1'))).toEqual({ crmHistoryEditingEnabled: true });
  });

  it('does not restore a cached grant when an offline event cancels an in-flight request', async () => {
    (featuresService.get as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    mockClient.setQueryData(featuresQueryKey('user-1'), { crmHistoryEditingEnabled: true });
    mockFocus();
    mockNetwork({ isConnected: false });
    await settle();
    expect(mockClient.getQueryData(featuresQueryKey('user-1'))).toEqual({ crmHistoryEditingEnabled: false });
  });

  it('removes app and network listeners when the screen unmounts', () => {
    cleanup();
    expect(mockRemoveAppState).toHaveBeenCalledTimes(1);
    expect(mockRemoveNetwork).toHaveBeenCalledTimes(1);
  });
});
