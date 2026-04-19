// Unit tests for the defense-in-depth /api/* middleware helper (#34 PR F).

import {
  PUBLIC_API_PATHS,
  isPublicApiPath,
  extractBearerToken,
  internalKeyMatches,
  hasValidInternalKey,
} from '../api-auth-matcher';

describe('PUBLIC_API_PATHS allow-list', () => {
  it('keeps the allow-list minimal and documented', () => {
    // If this number grows, double-check every new entry has a real HMAC /
    // OAuth / health reason — each one is a hole in the middleware gate.
    expect(PUBLIC_API_PATHS.length).toBeLessThanOrEqual(4);
    for (const entry of PUBLIC_API_PATHS) {
      expect(entry.prefix.startsWith('/api/')).toBe(true);
      expect(['oauth', 'hmac', 'health']).toContain(entry.reason);
    }
  });
});

describe('isPublicApiPath', () => {
  it('matches OAuth callback paths', () => {
    expect(isPublicApiPath('/api/auth/google/callback')).toBe(true);
    expect(isPublicApiPath('/api/auth/google')).toBe(true);
  });

  it('matches webhook paths', () => {
    expect(isPublicApiPath('/api/webhooks/paperclip')).toBe(true);
    expect(isPublicApiPath('/api/webhooks/anything/subpath')).toBe(true);
  });

  it('matches the exact OCR callback path but not arbitrary siblings', () => {
    expect(isPublicApiPath('/api/people-db/ingest/ocr/callback')).toBe(true);
    // Sibling or extended paths must NOT leak through.
    expect(isPublicApiPath('/api/people-db/ingest/ocr/callback/foo')).toBe(false);
    expect(isPublicApiPath('/api/people-db/ingest/ocr')).toBe(false);
    expect(isPublicApiPath('/api/people-db/ingest')).toBe(false);
  });

  it('rejects arbitrary paths that look like auth but are not', () => {
    expect(isPublicApiPath('/api/ai-settings/keys')).toBe(false);
    expect(isPublicApiPath('/api/iam/audit')).toBe(false);
    expect(isPublicApiPath('/api/paperclip/issues')).toBe(false);
    expect(isPublicApiPath('/api/supabase/sql')).toBe(false);
  });

  it('returns false for non-/api paths', () => {
    expect(isPublicApiPath('/superadmin/dashboard')).toBe(false);
    expect(isPublicApiPath('/')).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('returns the token for a well-formed Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
    expect(extractBearerToken('Bearer   xyz')).toBe('xyz');
  });

  it('returns null when the header is missing or malformed', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull(); // no token
    expect(extractBearerToken('Bearer ')).toBeNull(); // empty token
  });
});

describe('internalKeyMatches', () => {
  it('matches when both strings are equal and non-empty', () => {
    expect(internalKeyMatches('abc', 'abc')).toBe(true);
  });

  it('rejects mismatches, empty strings, or null', () => {
    expect(internalKeyMatches('abc', 'abd')).toBe(false);
    expect(internalKeyMatches('abc', '')).toBe(false);
    expect(internalKeyMatches('', 'abc')).toBe(false);
    expect(internalKeyMatches(null, 'abc')).toBe(false);
    expect(internalKeyMatches('abc', null)).toBe(false);
    expect(internalKeyMatches('abc', undefined)).toBe(false);
  });

  it('rejects when lengths differ even if prefix matches', () => {
    expect(internalKeyMatches('abc', 'abcd')).toBe(false);
    expect(internalKeyMatches('abcd', 'abc')).toBe(false);
  });
});

describe('hasValidInternalKey', () => {
  it('accepts a valid Bearer header with matching key', () => {
    expect(hasValidInternalKey('Bearer test-key-2026', 'test-key-2026')).toBe(true);
  });

  it('rejects all the not-valid cases', () => {
    expect(hasValidInternalKey('Bearer wrong', 'test-key-2026')).toBe(false);
    expect(hasValidInternalKey(null, 'test-key-2026')).toBe(false);
    expect(hasValidInternalKey('Bearer test', undefined)).toBe(false);
    expect(hasValidInternalKey('Basic test', 'test')).toBe(false);
  });
});
