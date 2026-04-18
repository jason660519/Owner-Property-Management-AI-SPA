import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import tseslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { "@typescript-eslint": tseslint },
    // Project policy: `any` is forbidden (see CLAUDE.md 硬性規定).
    // Pre-commit hook scripts/check-staged-no-any.js blocks new `any`.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    plugins: { "react-hooks": reactHooks },
    // React Compiler rules from eslint-plugin-react-hooks@7 are new and would
    // require a wave of component refactors. Track via a follow-up; warn for now.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // Tests legitimately need flexible mocks; relax the strict rules to warn
    // for test files only. Production code remains gated.
    files: [
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "**/__tests__/**",
      "**/unit_test/**",
      "**/unit_and_integration_test/**",
      "jest.setup.*",
    ],
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      react,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react/display-name": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
