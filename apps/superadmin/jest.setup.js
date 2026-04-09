import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'

// Polyfill for Next.js server components
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream
}

const { Headers, Request, Response } = require('undici')

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'
process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ||= 'localhost'

// Mock Next.js cache and server-only modules
jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock('next/headers', () => {
  const cookieStore = {
    getAll: jest.fn(() => []),
    set: jest.fn(),
  }
  return {
    cookies: jest.fn(async () => cookieStore),
    headers: jest.fn(async () => new Headers()),
  }
})

jest.mock('next/navigation', () => {
  const router = {
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }
  return {
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }
})

// Mock fetch globally（整合測試設 SUPABASE_INTEGRATION_TEST=1 以使用真實 fetch 連本機／遠端 Supabase）
if (process.env.SUPABASE_INTEGRATION_TEST !== '1') {
  global.fetch = jest.fn()
}

// Mock Request and Response for Next.js
if (typeof ReadableStream !== 'undefined' && typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream
}
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
if (typeof global.Headers === 'undefined') {
  global.Headers = Headers
}
if (typeof global.Request === 'undefined') {
  global.Request = Request
}
if (typeof global.Response === 'undefined') {
  global.Response = Response
}
if (typeof global.Response.json !== 'function') {
  global.Response.json = (data, init = {}) => {
    const headers = new Headers(init.headers)
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
    return new Response(JSON.stringify(data), { ...init, headers })
  }
}
