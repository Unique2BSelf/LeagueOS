import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@leagueos.local`;
}

test.describe('MVP registration flow', () => {
  test('player can create an account and reach the dashboard', async ({ page }) => {
    const email = uniqueEmail('pw-register');

    await page.goto('/register');
    await page.getByRole('button', { name: 'Use Test Photo' }).click();
    await page.getByLabel('Full Name').fill('Playwright Registration User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password$/).fill('Password123!');
    await page.getByLabel(/^Confirm Password$/).fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /control room/i })).toBeVisible();
    await expect(page.getByText(/League control room/i)).toBeVisible();
  });

  test('player can start season registration and reach Stripe checkout', async ({ page }) => {
    const email = uniqueEmail('pw-mvp');

    await page.goto('/register');
    await page.getByRole('button', { name: 'Use Test Photo' }).click();
    await page.getByLabel('Full Name').fill('Playwright MVP User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password$/).fill('Password123!');
    await page.getByLabel(/^Confirm Password$/).fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/dashboard');
    await page.goto('/dashboard/registrations');

    const registerButton = page.getByRole('button', { name: /Register for \$/ }).first();
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    const buyInsuranceButton = page.getByRole('button', { name: 'Buy Insurance' });
    if (await buyInsuranceButton.count()) {
      await buyInsuranceButton.click();
      await expect(page.getByText(/Insurance purchased successfully/i)).toBeVisible();
      await registerButton.click();
    }

    await expect(page.getByRole('heading', { name: 'Complete Payment' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue to Stripe' }).click();
    await page.waitForURL(/stripe\.com|stripe\.network|checkout\.stripe\.com/);
    await expect(page).toHaveURL(/stripe\.com|stripe\.network|checkout\.stripe\.com/);
  });
});
