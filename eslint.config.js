import js from '@eslint/js';

export default [
  {
    ignores: [
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '.husky/',
      'commitlint.config.js',
      '.lintstagedrc.json',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
];
