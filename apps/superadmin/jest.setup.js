import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Next.js server components
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js cache and server-only modules
jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock Request and Response for Next.js
if (typeof Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof Response === 'undefined') {
  global.Response = class Response {}
}
