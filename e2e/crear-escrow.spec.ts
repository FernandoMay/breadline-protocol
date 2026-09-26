import { test, expect } from '@playwright/test';

const SELLER = process.env.BREADLINE_E2E_SELLER || '';
const SECRET = process.env.BREADLINE_E2E_SECRET || '';
const ADDRESS = process.env.BREADLINE_E2E_ADDRESS || '';

/** Connect through the no-extension testnet signer. */
async function connect(page: import('@playwright/test').Page) {
  await page.goto('/app/dashboard');
  await page.getByRole('button', { name: /Connect Wallet/i }).first().click();
  await page.locator('#testnet-secret').fill(SECRET);
  await page.getByRole('button', { name: /Conectar con clave de testnet/i }).click();
  await expect(page.getByRole('heading', { name: 'Conectar wallet' })).toHaveCount(0, {
    timeout: 30_000,
  });
}

test.describe('create escrow', () => {
  test.skip(!SECRET || !SELLER, 'needs BREADLINE_E2E_SECRET and BREADLINE_E2E_SELLER');

  test.beforeEach(async ({ page }) => {
    await connect(page);
    // Navigate through the in-app router, the way a user does. A hard
    // `page.goto` reloads and would drop the wallet session.
    await page.getByRole('link', { name: 'Crear Escrow', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /Nueva Orden de Custodia/i })).toBeVisible();
  });

  const sellerField = (page: import('@playwright/test').Page) =>
    page.getByPlaceholder(/public key de tu cliente/i);
  const submit = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: /Generar Enlace de Custodia Segura/i });

  /** Fill every field `handleGenerate` requires before it will do any work. */
  async function fillForm(page: import('@playwright/test').Page, seller: string) {
    await page.getByPlaceholder(/Acme Corp|Apex Studios/i).fill('Cliente de Prueba');
    await page.getByPlaceholder(/Desarrollo Frontend/i).fill('Auditoria E2E');
    await page.locator('input[type="number"]').first().fill('5');
    await sellerField(page).fill(seller);
  }

  test('a refresh restores the testnet session', async ({ page }) => {
    // Regression guard: a hard reload used to drop the wallet, so opening a deep
    // link or refreshing mid-demo produced "connect your wallet" with no way to
    // tell that the account was already connected.
    await page.reload();
    await expect(page.getByText(/Connected •/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('an incomplete form is rejected with an explanation, not silence', async ({ page }) => {
    // Regression guard: submitting an empty form previously looked like a dead
    // button because the toast text was not covered by any assertion.
    await submit(page).click();
    await expect(page.getByText(/Fill in all required fields/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('rejects a seller equal to the connected buyer', async ({ page }) => {
    // buyer == seller used to be silently accepted, which made the demo show
    // "Fernando pays Fernando". The contract now also rejects it.
    await fillForm(page, ADDRESS);
    await submit(page).click();

    await expect(page.getByText(/distinto|diferente|no puede ser/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('rejects a malformed seller address', async ({ page }) => {
    await fillForm(page, 'NOT-A-VALID-KEY');
    await submit(page).click();

    await expect(page.getByText(/inválid|no válida| Stellar /i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the create flow always terminates in a defined, legible state', async ({ page }) => {
    // What this guarantees: clicking create never leaves the user hanging. It
    // either produces the escrow, or it explains why it could not. A silent
    // no-op is the regression being guarded against.
    //
    // It does NOT guarantee the transaction lands: the public Testnet RPC
    // throttles resource-heavy transactions (WASM upload) with TRY_AGAIN_LATER,
    // which is an infrastructure condition, not a product defect.
    await fillForm(page, SELLER);
    await submit(page).click();

    const success = page.getByText(/¡Enlace Listo/i).first();
    const toast = page.locator('.fixed.top-24').first();

    const outcome = await Promise.race([
      success.waitFor({ timeout: 90_000 }).then(() => 'created'),
      toast.waitFor({ timeout: 90_000 }).then(() => 'error'),
    ]).catch(() => 'hang');

    expect(outcome, 'the create flow produced neither a result nor an explanation').not.toBe('hang');

    if (outcome === 'error') {
      const msg = ((await toast.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      expect(msg, 'an error was shown with no message').not.toBe('');
      // eslint-disable-next-line no-console
      console.log(`  [deploy outcome] ${msg}`);
    } else {
      // A created escrow must be remembered for this wallet.
      const stored = await page.evaluate(() =>
        Object.keys(window.localStorage).filter((k) => k.includes('activeEscrow')),
      );
      expect(stored.length, 'a created escrow was not remembered per wallet').toBeGreaterThan(0);
    }
  });

  test('any failure surfaced to the user is the app wording, never a raw status', async ({ page }) => {
    // Regression guard for the retry path added after TRY_AGAIN_LATER started
    // failing deploys. Whichever way the run ends, the user must see the app's
    // own message rather than a raw transport status.
    await fillForm(page, SELLER);
    await submit(page).click();

    const success = page.getByText(/¡Enlace Listo/i).first();
    const toast = page.locator('.fixed.top-24').first();

    const outcome = await Promise.race([
      success.waitFor({ timeout: 90_000 }).then(() => 'created'),
      toast.waitFor({ timeout: 90_000 }).then(() => 'toast'),
    ]).catch(() => 'hang');

    expect(outcome, 'the create flow produced neither a result nor an explanation').not.toBe('hang');

    if (outcome === 'toast') {
      const msg = ((await toast.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      expect(msg, 'an error was shown with no message').not.toBe('');
      expect(msg).not.toMatch(/^\s*\[object Object\]/);
      // Either the throttle wording or the generic failure wrapper; never a bare
      // Soroban status code on its own.
      expect(msg).toMatch(/saturada|reintentar|Failed to create escrow|Transaction failed/i);
    }
  });

  test('milestone payment mode is not selectable', async ({ page }) => {
    // The contract has a single amount and a single escrow, so the milestone
    // option was an overclaim and must stay disabled.
    const milestones = page.getByRole('button', { name: /hitos|milestone/i }).first();
    if (await milestones.count()) {
      await expect(milestones).toBeDisabled();
    } else {
      // Acceptable alternative: the option was removed rather than disabled.
      await expect(page.getByRole('button', { name: /hitos|milestone/i })).toHaveCount(0);
    }
  });
});
