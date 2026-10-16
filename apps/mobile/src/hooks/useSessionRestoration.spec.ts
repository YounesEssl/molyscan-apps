const mockEffects: Array<() => () => void> = [];
const mockSetStatus = jest.fn();
let mockAppState: (value: string) => void;
let mockNetwork: (state: { isConnected: boolean | null }) => void;
const mockRemove = jest.fn();
const mockUnsubscribe = jest.fn();
jest.mock('react', () => ({
  useState: (initial: unknown) => [initial, mockSetStatus],
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => () => void) => { mockEffects.push(effect); },
}));
jest.mock('react-native', () => ({ AppState: {
  addEventListener: (_type: string, listener: typeof mockAppState) => {
    mockAppState = listener; return { remove: mockRemove };
  },
} }));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (listener: typeof mockNetwork) => { mockNetwork = listener; return mockUnsubscribe; },
}));
jest.mock('@/lib/restoreSession', () => ({ restoreSession: jest.fn() }));
import { restoreSession } from '@/lib/restoreSession';
import { useSessionRestoration } from './useSessionRestoration';
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('session recovery triggers', () => {
  let cleanup: () => void;
  let hook: ReturnType<typeof useSessionRestoration>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockEffects.length = 0;
    (restoreSession as jest.Mock).mockResolvedValue('unavailable');
    hook = useSessionRestoration();
    cleanup = mockEffects[0]();
  });
  afterEach(() => cleanup());
  it('allows manual recovery, foreground recovery and recovery after reconnection', async () => {
    await settle();
    expect(mockSetStatus).toHaveBeenLastCalledWith('unavailable');
    hook.retry();
    await settle();
    mockAppState('active');
    await settle();
    mockNetwork({ isConnected: false });
    mockNetwork({ isConnected: true });
    await settle();
    expect(restoreSession).toHaveBeenCalledTimes(4);
  });
  it('does not loop on repeated connected network events', async () => {
    await settle();
    mockNetwork({ isConnected: true });
    mockNetwork({ isConnected: true });
    await settle();
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });
  it('keeps a pending reconnect trigger until the in-flight attempt finishes', async () => {
    await settle();
    let finish!: (result: string) => void;
    (restoreSession as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    hook.retry();
    mockNetwork({ isConnected: false });
    mockNetwork({ isConnected: true });
    expect(restoreSession).toHaveBeenCalledTimes(2);
    finish('unavailable');
    await settle();
    expect(restoreSession).toHaveBeenCalledTimes(3);
  });
  it('ignores a late result and removes listeners on unmount', async () => {
    await settle();
    let finish!: (result: string) => void;
    (restoreSession as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    hook.retry();
    cleanup();
    mockSetStatus.mockClear();
    finish('ready');
    await settle();
    expect(mockSetStatus).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
