/** T0103: stylelint wiring. Standard rules; G1 token rules for SUS-authored
 * CSS arrive with the token pipeline (T0401). Fixture CSS is pre-SUS scan
 * target material and is intentionally not token-enforced here. */
export default {
  extends: ['stylelint-config-standard'],
  files: ['**/*.css'],
  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/exports/**'],
};
