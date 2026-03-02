// filepath: apps/superadmin/lib/utils/storage-state.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  readLocalStorage,
  writeLocalStorage,
  readSessionStorage,
  writeSessionStorage,
} from './storage-state';

// ── localStorage helpers ─────────────────────────────────────────────────────

describe('readLocalStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns fallback when key is missing', () => {
    expect(readLocalStorage('no-such-key', 'default')).toBe('default');
  });

  it('returns parsed value when key exists with valid JSON', () => {
    localStorage.setItem('test-key', JSON.stringify({ a: 1 }));
    expect(readLocalStorage('test-key', null)).toEqual({ a: 1 });
  });

  it('returns fallback when stored value is invalid JSON', () => {
    localStorage.setItem('bad-json', 'not valid {json}');
    expect(readLocalStorage('bad-json', 42)).toBe(42);
  });

  it('preserves type for string fallback', () => {
    expect(readLocalStorage<string>('missing', 'hello')).toBe('hello');
  });

  it('preserves type for array fallback', () => {
    const fallback: string[] = [];
    expect(readLocalStorage<string[]>('missing', fallback)).toEqual([]);
  });

  it('returns stored string (not double-parsed) when value is a quoted JSON string', () => {
    localStorage.setItem('str-key', JSON.stringify('hello world'));
    expect(readLocalStorage<string>('str-key', '')).toBe('hello world');
  });

  it('handles SSR (no window) gracefully by returning fallback', () => {
    // Simulate SSR: localStorage throws ReferenceError
    const original = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(readLocalStorage('key', 'fallback')).toBe('fallback');
    Object.defineProperty(global, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('writeLocalStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('stores value as JSON string', () => {
    writeLocalStorage('k', { x: 2 });
    expect(localStorage.getItem('k')).toBe(JSON.stringify({ x: 2 }));
  });

  it('overwrites an existing value', () => {
    writeLocalStorage('k', 'first');
    writeLocalStorage('k', 'second');
    expect(localStorage.getItem('k')).toBe(JSON.stringify('second'));
  });

  it('stores null', () => {
    writeLocalStorage('k', null);
    expect(localStorage.getItem('k')).toBe('null');
  });

  it('does not throw on SSR (no window)', () => {
    const original = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => writeLocalStorage('k', 'v')).not.toThrow();
    Object.defineProperty(global, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

// ── sessionStorage helpers ───────────────────────────────────────────────────

describe('readSessionStorage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('returns fallback when key is missing', () => {
    expect(readSessionStorage('no-such-key', 99)).toBe(99);
  });

  it('returns parsed value when key exists', () => {
    sessionStorage.setItem('test-key', JSON.stringify([1, 2, 3]));
    expect(readSessionStorage('test-key', [])).toEqual([1, 2, 3]);
  });

  it('returns fallback for invalid JSON', () => {
    sessionStorage.setItem('bad', 'oops');
    expect(readSessionStorage('bad', 'safe')).toBe('safe');
  });

  it('handles SSR (no window) gracefully by returning fallback', () => {
    const original = global.sessionStorage;
    Object.defineProperty(global, 'sessionStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(readSessionStorage('key', 'fb')).toBe('fb');
    Object.defineProperty(global, 'sessionStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('writeSessionStorage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('stores value as JSON string', () => {
    writeSessionStorage('k', ['a', 'b']);
    expect(sessionStorage.getItem('k')).toBe(JSON.stringify(['a', 'b']));
  });

  it('overwrites an existing value', () => {
    writeSessionStorage('k', 'first');
    writeSessionStorage('k', 'second');
    expect(sessionStorage.getItem('k')).toBe(JSON.stringify('second'));
  });

  it('stores boolean false', () => {
    writeSessionStorage('flag', false);
    expect(sessionStorage.getItem('flag')).toBe('false');
  });

  it('does not throw on SSR (no window)', () => {
    const original = global.sessionStorage;
    Object.defineProperty(global, 'sessionStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => writeSessionStorage('k', 'v')).not.toThrow();
    Object.defineProperty(global, 'sessionStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});
