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

test.describe('MVP schedule flow', () => {
  test('admin can generate a season schedule and public schedule shows it', async ({ browser, baseURL }) => {
    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();

    await bootstrapSession(adminPage, {
      email: `${uniqueLabel('pw-schedule-admin')}@leagueos.local`,
      fullName: 'Playwright Schedule Admin',
      role: 'ADMIN',
    });

    const fixtureResponse = await adminPage.request.post('/api/test/schedule-fixtures', {
      data: { label: uniqueLabel('schedule') },
    });
    expect(fixtureResponse.ok()).toBeTruthy();
    const fixture = await fixtureResponse.json();

    await adminPage.goto('/dashboard/schedule-generator');
    await adminPage.getByTestId('schedule-season-select').selectOption(fixture.seasonId);
    await adminPage.getByTestId('schedule-dates-input').fill(fixture.dates.join(','));
    await adminPage.getByTestId('generate-schedule-button').click();

    await expect(adminPage.getByText(new RegExp(`Saved \\d+ matches for ${fixture.seasonName}`))).toBeVisible();
    await expect(adminPage.getByTestId('generated-schedule-table')).toContainText(fixture.teamNames[0]);
    await expect(adminPage.getByTestId('generated-schedule-table')).toContainText(fixture.teamNames[1]);

    const publicContext = await browser.newContext({ baseURL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/schedule?season=${fixture.seasonId}`);
    await expect(publicPage.getByRole('heading', { name: 'Match Schedule' })).toBeVisible();
    await expect(publicPage.getByTestId('public-schedule-season-select')).toHaveValue(fixture.seasonId);
    await expect(publicPage.getByTestId('public-schedule-match').first()).toContainText(fixture.teamNames[0]);

    await publicContext.close();
    await adminContext.close();
  });
});
