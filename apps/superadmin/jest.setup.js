import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'

// Polyfill for Next.js server components
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js cache and server-only modules
jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock fetch globally（整合測試設 SUPABASE_INTEGRATION_TEST=1 以使用真實 fetch 連本機／遠端 Supabase）
if (process.env.SUPABASE_INTEGRATION_TEST !== '1') {
  global.fetch = jest.fn()
}

// Mock Request and Response for Next.js
if (typeof ReadableStream !== 'undefined' && typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream
}
if (typeof Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof Response === 'undefined') {
  global.Response = class Response {}
}
