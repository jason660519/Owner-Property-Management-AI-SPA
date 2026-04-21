import {
  getNextAdapter,
  isAdapterQuotaError,
  ADAPTER_FALLBACK_CHAIN,
} from '../adapter-fallback';

describe('getNextAdapter', () => {
  it('follows the full fallback chain in order', () => {
    expect(getNextAdapter('claude_local')).toBe('codex_local');
    expect(getNextAdapter('codex_local')).toBe('cursor');
    expect(getNextAdapter('cursor')).toBe('opencode_local');
    expect(getNextAdapter('opencode_local')).toBe('pi_local');
    expect(getNextAdapter('pi_local')).toBeNull();
  });

  it('returns first adapter for unknown adapter type', () => {
    expect(getNextAdapter('unknown_adapter')).toBe('claude_local');
  });

  it('chain has 5 adapters', () => {
    expect(ADAPTER_FALLBACK_CHAIN.length).toBe(5);
  });
});

describe('isAdapterQuotaError', () => {
  it('detects "Quota exceeded" errors', () => {
    expect(isAdapterQuotaError('Quota exceeded. Check your plan and billing details.')).toBe(true);
  });

  it('detects "adapter_failed" errors', () => {
    expect(isAdapterQuotaError('(adapter_failed)')).toBe(true);
  });

  it('detects rate limit errors', () => {
    expect(isAdapterQuotaError('Rate limit exceeded')).toBe(true);
    expect(isAdapterQuotaError('rate_limit_error')).toBe(true);
  });

  it('detects 429 status codes', () => {
    expect(isAdapterQuotaError('HTTP 429 Too Many Requests')).toBe(true);
  });

  it('detects billing errors', () => {
    expect(isAdapterQuotaError('You exceeded your current quota')).toBe(true);
    expect(isAdapterQuotaError('insufficient_quota')).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(isAdapterQuotaError(null)).toBe(false);
    expect(isAdapterQuotaError(undefined)).toBe(false);
  });

  it('returns false for non-quota errors', () => {
    expect(isAdapterQuotaError('File not found')).toBe(false);
    expect(isAdapterQuotaError('Syntax error in code')).toBe(false);
  });
});
