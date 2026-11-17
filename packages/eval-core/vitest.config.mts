import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Twenty-odd files in this package drive a real browser, Lighthouse or `next start`. At the default
    // worker count (one per core, ten on this machine) they compete for CPU, and three of them blew their
    // 180 s budgets while finishing in 213 s *together* when run alone. The cap keeps the suite measuring
    // the code instead of the scheduler; vitest still reports per-file duration, so a genuine slowdown is
    // still visible rather than hidden.
    maxWorkers: 4,
  },
});
