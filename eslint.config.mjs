import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * SUS lint config (T0103). Tiered per task acceptance:
 *  - error: correctness + the G1 precursor (no raw hex colors in SUS package
 *    sources; styling must reference design tokens once T0401 lands them)
 *  - fixtures/ are excluded: fixture apps are scan targets with pre-SUS
 *    styling, and Next-generated dirs are not contributor code.
 */

import { noRawStyleValues } from './scripts/lint-rules/no-raw-style-values.mjs';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'fixtures/**',
      'archive/**',
      'reviews/**',
      '.sus-dev/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    plugins: { sus: { rules: { 'no-raw-style-values': noRawStyleValues } } },
    rules: {
      'sus/no-raw-style-values': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
);
