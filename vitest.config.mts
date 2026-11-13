import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // package-local tests: each package uses the workspace runner config
    projects: ['packages/*/vitest.config.mts', 'fixtures/*/vitest.config.mts'],
  },
});
