import { expect, test } from '@playwright/test';

function uniqueLabel(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function bootstrapSession(page: import('@playwright/test').Page, options: {
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CAPTAIN' | 'PLAYER';
}) {
  const response = await page.request.post('/api/test/session', {
    data: options,
  });
  expect(response.ok()).toBeTruthy();

  const setCookieHeader = response.headers()['set-cookie'];
  const sessionMatch = setCookieHeader?.match(/leagueos_session=([^;]+)/);
  expect(sessionMatch?.[1]).toBeTruthy();
  const cookieUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dev.corridor.soccer';

  await page.context().addCookies([
    {
      name: 'leagueos_session',
      value: sessionMatch![1],
      url: cookieUrl,
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
    },
  ]);
}

test.describe('MVP player availability and sub request flow', () => {
  test('player marks unavailable, requests a sub, and another eligible player claims it', async ({ browser, baseURL }) => {
    const requesterEmail = `${uniqueLabel('pw-requester')}@leagueos.local`;
    const claimantEmail = `${uniqueLabel('pw-claimant')}@leagueos.local`;

    const requesterContext = await browser.newContext({ baseURL });
    const requesterPage = await requesterContext.newPage();
    await bootstrapSession(requesterPage, {
      email: requesterEmail,
      fullName: 'Playwright Requester',
      role: 'PLAYER',
    });

    const claimantContext = await browser.newContext({ baseURL });
    const claimantPage = await claimantContext.newPage();
    await bootstrapSession(claimantPage, {
      email: claimantEmail,
      fullName: 'Playwright Claimant',
      role: 'PLAYER',
    });

    const fixtureResponse = await requesterPage.request.post('/api/test/player-fixtures', {
      data: {
        label: uniqueLabel('player-flow'),
        requesterEmail,
        claimantEmail,
      },
    });
    expect(fixtureResponse.ok()).toBeTruthy();

    await requesterPage.goto('/dashboard/availability');
    const availabilityCard = requesterPage.getByTestId('availability-match-card').first();
    await expect(availabilityCard).toBeVisible();
    const noButton = availabilityCard.locator('[data-testid^="availability-no-"]').first();
    await noButton.click();
    await expect(requesterPage.locator('text=Unavailable').locator('..')).toContainText('1');

    await requesterPage.goto('/dashboard/subs');
    const requestButton = requesterPage.locator('[data-testid^="request-sub-"]').first();
    await expect(requestButton).toBeVisible();
    await requestButton.click();
    await expect(requesterPage.getByTestId('my-sub-request').first()).toContainText('Status: OPEN');

    await claimantPage.goto('/dashboard/subs');
    const claimButton = claimantPage.locator('[data-testid^="claim-sub-"]').first();
    await expect(claimButton).toBeVisible();
    await claimButton.click();

    await requesterPage.reload();
    await expect(requesterPage.getByTestId('my-sub-request').first()).toContainText('CLAIMED');
    await expect(requesterPage.getByTestId('my-sub-request').first()).toContainText('Claimed by');

    await claimantContext.close();
    await requesterContext.close();
  });
});

