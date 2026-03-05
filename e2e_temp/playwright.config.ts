import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 1,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: 'https://fortunelab.store',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ignoreHTTPSErrors: false,
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
