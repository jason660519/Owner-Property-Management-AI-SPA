/* eslint-disable @typescript-eslint/no-require-imports */
// React 19 CJS: `act` exists only when NODE_ENV is not `production`. next/jest can load react
// before Jest flips NODE_ENV; pin early so @testing-library/react works.
process.env.NODE_ENV = 'test'

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Ignore ID-scoped unit_test folders except 009 (security dashboard TDD)
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/unit_test/(?!009/)', '\\.integration\\.test\\.ts$'],
  maxWorkers: 2,
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
