import { AxiosError, type AxiosResponse } from 'axios';
import {
  classifyError,
  computeBackoffMs,
  retryAfterMs,
  errorMessage,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
} from './retryPolicy';

function axiosError(status?: number, headers: Record<string, string> = {}): AxiosError {
  const err = new AxiosError('request failed');
  if (status !== undefined) {
    err.response = {
      status,
      statusText: '',
      data: {},
      headers,
      config: {} as never,
    } as AxiosResponse;
  }
  return err;
}

describe('classifyError', () => {
  it('treats a network error (no response) as retryable', () => {
    expect(classifyError(axiosError())).toBe('retryable');
  });

  it('treats 409 as a duplicate (idempotency hit)', () => {
    expect(classifyError(axiosError(409))).toBe('duplicate');
  });

  it('treats 429 / 408 / 5xx as retryable', () => {
    expect(classifyError(axiosError(429))).toBe('retryable');
    expect(classifyError(axiosError(408))).toBe('retryable');
    expect(classifyError(axiosError(500))).toBe('retryable');
    expect(classifyError(axiosError(503))).toBe('retryable');
  });

  it('treats 4xx client errors as fatal (dead-letter)', () => {
    expect(classifyError(axiosError(400))).toBe('fatal');
    expect(classifyError(axiosError(401))).toBe('fatal');
    expect(classifyError(axiosError(403))).toBe('fatal');
    expect(classifyError(axiosError(422))).toBe('fatal');
  });

  it('treats non-axios errors as retryable', () => {
    expect(classifyError(new Error('boom'))).toBe('retryable');
  });
});

describe('computeBackoffMs', () => {
  it('starts at roughly BASE_BACKOFF_MS', () => {
    const b = computeBackoffMs(0);
    expect(b).toBeGreaterThanOrEqual(BASE_BACKOFF_MS);
    expect(b).toBeLessThan(BASE_BACKOFF_MS + 1_000);
  });

  it('grows exponentially before the cap', () => {
    expect(computeBackoffMs(2)).toBeGreaterThanOrEqual(BASE_BACKOFF_MS * 4);
    expect(computeBackoffMs(3)).toBeGreaterThanOrEqual(BASE_BACKOFF_MS * 8);
  });

  it('never exceeds MAX_BACKOFF_MS beyond jitter', () => {
    const b = computeBackoffMs(100);
    expect(b).toBeGreaterThanOrEqual(MAX_BACKOFF_MS);
    expect(b).toBeLessThan(MAX_BACKOFF_MS + 1_000);
  });
});

describe('retryAfterMs', () => {
  it('parses a Retry-After header in seconds', () => {
    expect(retryAfterMs(axiosError(429, { 'retry-after': '5' }))).toBe(5_000);
  });

  it('returns null when the header is absent', () => {
    expect(retryAfterMs(axiosError(429))).toBeNull();
  });

  it('returns null for a non-numeric header', () => {
    expect(retryAfterMs(axiosError(429, { 'retry-after': 'soon' }))).toBeNull();
  });

  it('returns null for non-axios errors', () => {
    expect(retryAfterMs(new Error('x'))).toBeNull();
  });
});

describe('errorMessage', () => {
  it('formats an axios HTTP error with its status', () => {
    expect(errorMessage(axiosError(500))).toContain('HTTP 500');
  });

  it('formats a network axios error without a status', () => {
    expect(errorMessage(axiosError())).toContain('network');
  });

  it('formats a plain Error', () => {
    expect(errorMessage(new Error('nope'))).toBe('nope');
  });
});
