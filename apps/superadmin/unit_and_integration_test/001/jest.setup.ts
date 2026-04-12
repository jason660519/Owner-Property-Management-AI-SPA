/**
 * Jest setup for Row-001 unit/integration tests.
 */

import '@testing-library/jest-dom'

// Env vars
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'
process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ||= 'localhost'

// Mock Next.js server modules
jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
  headers: jest.fn(async () => new Map()),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: jest.fn(),
}))

// Polyfills
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof global.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin = '0px'
    readonly thresholds: ReadonlyArray<number> = [0]

    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}

    observe(_target: Element) {}
    unobserve(_target: Element) {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// Mock fetch
global.fetch = jest.fn()
