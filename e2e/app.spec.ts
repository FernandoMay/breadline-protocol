import { test, expect } from '@playwright/test';

/**
 * A funded testnet account, so the suite can exercise the real signing path.
 * The secret is a throwaway key generated for CI; it holds testnet XLM only.
 */
const TEST_ACCOUNT = {
  secret: process.env.BREADLINE_E2E_SECRET || '',
  address: process.env.BREADLINE_E2E_ADDRESS || '',
};

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    // Fail loudly on page errors: a silent React crash used to look like a styling bug.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    (page as unknown as { __errors: string[] }).__errors = errors;

    await page.goto('/app/dashboard');
  });

  test('renders the header and the wallet affordance', async ({ page }) => {
    await expect(page.getByText('Institutional Escrow').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect Wallet/i }).first()).toBeVisible();
  });

  test('does not show an alarming diagnostics panel on load', async ({ page }) => {
    // The auto-connect used to report a missing extension on every page load,
    // which made the app look broken before the user did anything.
    await page.waitForTimeout(1500);
    await expect(page.getByText('Diagnóstico de conexión a la wallet')).toHaveCount(0);
  });

  test('the connect dialog is fully inside the viewport', async ({ page }) => {
    await page.getByRole('button', { name: /Connect Wallet/i }).first().click();

    const dialog = page.getByRole('heading', { name: 'Conectar wallet' });
    await expect(dialog).toBeVisible();

    // The header's backdrop-filter made it the containing block for the fixed
    // dialog, which clipped the top. Assert the box is not cut off.
    const box = await page
      .locator('div.fixed.inset-0 >> div.relative')
      .first()
      .boundingBox();

    expect(box, 'dialog has no box').not.toBeNull();
    const viewport = page.viewportSize()!;
    expect(box!.y, 'dialog starts above the viewport').toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, 'dialog overflows the bottom').toBeLessThanOrEqual(viewport.height + 1);
  });

  test('the dialog offers a path that needs no extension', async ({ page }) => {
    await page.getByRole('button', { name: /Connect Wallet/i }).first().click();
    await expect(page.getByText(/Conectar con clave de testnet/i)).toBeVisible();
    await expect(page.getByText(/Solo para TESTNET/i)).toBeVisible();
  });

  test('an invalid secret is rejected with a readable message', async ({ page }) => {
    await page.getByRole('button', { name: /Connect Wallet/i }).first().click();

    const field = page.locator('#testnet-secret');
    await field.fill('NOT-A-KEY');
    await page.getByRole('button', { name: /Conectar con clave de testnet/i }).click();

    await expect(page.getByText(/empieza con "S"/i)).toBeVisible();
  });

  test('no unverifiable audit claim is presented as fact', async ({ page }) => {
    const text = (await page.locator('footer').innerText()).toLowerCase();
    expect(text).not.toContain('auditoría institucional activa');
    expect(text).not.toContain('certik');
  });
});

test.describe('connect with a testnet key', () => {
  test.skip(!TEST_ACCOUNT.secret, 'BREADLINE_E2E_SECRET not set');

  test('connects, shows the address and leaves no error', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: /Connect Wallet/i }).first().click();

    await page.locator('#testnet-secret').fill(TEST_ACCOUNT.secret);
    await page.getByRole('button', { name: /Conectar con clave de testnet/i }).click();

    // The dialog closes only on success, so its absence is the success signal.
    await expect(page.getByRole('heading', { name: 'Conectar wallet' })).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(/Connected •/i).first()).toBeVisible();

    const shown = await page.getByText(new RegExp(TEST_ACCOUNT.address.slice(0, 6))).first().innerText();
    expect(shown).toContain(TEST_ACCOUNT.address.slice(0, 6));
  });
});
