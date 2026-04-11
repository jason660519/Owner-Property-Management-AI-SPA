/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Jest config for Row-001 TDD tests.
 * Uses babel-jest with next/babel preset to avoid next/jest SWC issues.
 */
const path = require('path')

/** @type {import('jest').Config} */
module.exports = {
  testEnvironmentOptions: {
    // Ensure React development build is used (needed for React.act)
    NODE_ENV: 'test',
  },
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: [
    path.resolve(__dirname, 'unit_and_integration_test/001/jest.setup.ts'),
  ],
  testMatch: [
    '<rootDir>/unit_and_integration_test/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['babel-jest', {
      presets: ['next/babel'],
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': path.resolve(__dirname, '$1'),
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|svg|ico|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: ['/node_modules/(?!(next|@next)/)'],
  maxWorkers: 2,
}
