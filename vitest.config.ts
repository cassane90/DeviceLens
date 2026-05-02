import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom to simulate browser APIs (localStorage, DOM, etc.)
    environment: 'jsdom',
    // Show each test name in output for better readability
    reporters: 'verbose',
    // Global test setup — no need to import expect, it, describe in every test file
    globals: true,
  },
});
