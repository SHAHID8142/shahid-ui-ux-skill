import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    // React 19 automatic JSX runtime (tsconfig uses "preserve" for Next,
    // so tests need the transform here)
    jsx: 'automatic',
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
