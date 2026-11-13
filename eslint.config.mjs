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

/** G1 precursor: forbid raw hex color literals in SUS package sources. */
const susNoRawStyleValues = {
  meta: {
    type: 'problem',
    docs: { description: 'no raw hex color literals in SUS package sources (G1 precursor)' },
    messages: {
      rawHex:
        'Raw hex color "{{value}}". SUS package styling must reference design tokens (ADR-004/G1), not literals.',
    },
  },
  create(context) {
    const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    return {
      Literal(node) {
        if (typeof node.value === 'string' && HEX.test(node.value.trim())) {
          context.report({ node, messageId: 'rawHex', data: { value: node.value.trim() } });
        }
      },
      TemplateElement(node) {
        const raw = (node.value?.raw ?? '').trim();
        if (HEX.test(raw)) {
          context.report({ node, messageId: 'rawHex', data: { value: raw } });
        }
      },
    };
  },
};

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
    plugins: { sus: { rules: { 'no-raw-style-values': susNoRawStyleValues } } },
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
