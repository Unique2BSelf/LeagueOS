import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@leagueos.local`;
}

test.describe('Insurance gating flow', () => {
  test('player is blocked from registration until annual insurance is purchased', async ({ page }) => {
    const email = uniqueEmail('pw-insurance-gate');

    await page.goto('/register');
    await page.getByRole('button', { name: 'Use Test Photo' }).click();
    await page.getByLabel('Full Name').fill('Playwright Insurance Player');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password$/).fill('Password123!');
    await page.getByLabel(/^Confirm Password$/).fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/registrations');
    await expect(page.getByText(/Annual insurance is required before any season registration/i)).toBeVisible();
    const blockedButton = page.getByRole('button', { name: /Annual Insurance Required/i }).first();
    await expect(blockedButton).toBeDisabled();

    await page.goto('/dashboard/insurance-status');
    await expect(page.getByText(/You cannot register for any season yet/i)).toBeVisible();

    await page.getByRole('button', { name: /Buy Annual Insurance/i }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    const stripeUrl = new URL(page.url());
    const sessionId = stripeUrl.pathname.split('/').pop() || '';
    expect(sessionId.startsWith('cs_')).toBeTruthy();

    const paymentsResponse = await page.request.get('/api/payments');
    expect(paymentsResponse.ok()).toBeTruthy();
    const payments = await paymentsResponse.json();
    const insurancePayment = payments.find((payment: { transactionType: string; stripeSessionId?: string }) =>
      payment.transactionType === 'INSURANCE' && payment.stripeSessionId === sessionId
    );
    expect(insurancePayment?.id).toBeTruthy();

    const finalizeResponse = await page.request.post('/api/test/payments/complete', {
      data: { paymentId: insurancePayment.id },
    });
    expect(finalizeResponse.ok()).toBeTruthy();

    await page.goto(`/dashboard/insurance-status?payment=success&session_id=${sessionId}`);
    await expect(page.getByText(/Annual insurance is now active/i)).toBeVisible();
    await expect(page.getByText(/You are cleared to register/i)).toBeVisible();

    await page.goto('/dashboard/registrations');
    await expect(page.getByText(/Registration Blocked/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Register for \$/i }).first()).toBeEnabled();
  });
});
