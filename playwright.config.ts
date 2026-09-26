import { defineConfig, devices } from '@playwright/test';

/**
 * Breadline E2E suite.
 *
 * Runs against the real Vite dev server and the real Stellar Testnet contract,
 * using the app's built-in testnet signer so a browser wallet extension is not
 * required. Failures attach a screenshot plus any console errors.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5178',
    // Traces/screenshots are skipped by default: this repo sits on a OneDrive
    // path on a nearly full disk, and a full run produced ~80 MB of artifacts.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    // The cached Playwright build ships the full Chromium, not the headless shell.
    channel: 'chromium',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Serves the production build. The Vite dev server is unusable on this
    // OneDrive path (EMFILE in its watcher), and testing `dist` matches what
    // Netlify actually serves.
    command: 'npm run build && node e2e/serve-dist.cjs',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
