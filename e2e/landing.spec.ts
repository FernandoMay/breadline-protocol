import { test, expect } from '@playwright/test';

/**
 * Landing page: the marketing surface a judge sees first.
 * Every assertion here maps to a claim or a link that was previously wrong.
 */
test.describe('landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the brand and a single testnet badge', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Breadline' }).first()).toBeVisible();

    // The badge was duplicated once; it must appear exactly once in the header.
    const header = page.locator('header');
    await expect(header.getByText('Stellar Testnet')).toHaveCount(1);
  });

  test('the logo image actually loads', async ({ page }) => {
    // The logo used to be a remote Google URL returning HTTP 403, which showed
    // the alt text instead. Assert on a real, decoded image.
    const logo = page.locator('header img').first();
    await expect(logo).toBeVisible();

    const ok = await logo.evaluate((img) => {
      const el = img as HTMLImageElement;
      return el.complete && el.naturalWidth > 0;
    });
    expect(ok, 'header logo failed to decode').toBe(true);
  });

  test('no dead anchors in the header', async ({ page }) => {
    const dead = await page.locator('header a[href="#"]').count();
    expect(dead, 'header contains href="#" dead links').toBe(0);
  });

  test('the Soroban link points at the live contract, not a deprecated one', async ({ page }) => {
    const link = page.getByRole('link', { name: /Garant/i }).first();
    const href = await link.getAttribute('href');
    expect(href).toContain('stellar.expert/explorer/testnet/contract/');
    // The v1 contract was state-only and has no custody; it must not be linked.
    expect(href).not.toContain('CARLT3ENKBA5KTWE4R4PSHX6YAI6P6FFU6ZHNKNTSUINRG6FM554YCU5');
  });

  test('primary CTAs route into the app', async ({ page }) => {
    const cta = page.getByRole('link', { name: /Crear Enlace Seguro/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /\/app\//);
  });

  test('no unverifiable audit claim is presented as fact', async ({ page }) => {
    // "Auditoría CertiK", "OtterSec" and "Auditoría Institucional Activa" were all
    // removed because they cannot be evidenced.
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('certik');
    expect(body).not.toContain('ottersec');
    expect(body).not.toContain('auditoría institucional activa');
  });

  test('mobile viewport exposes the navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // The nav was xl-only with no mobile fallback, so the links vanished below 1280px.
    const menu = page.locator('#mobile-nav summary');
    await expect(menu).toBeVisible();

    await menu.click();
    await expect(page.locator('#mobile-nav nav a', { hasText: 'Cómo funciona' })).toBeVisible();
  });
});
