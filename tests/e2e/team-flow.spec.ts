import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@leagueos.local`;
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

test.describe('MVP team flow', () => {
  test('admin can create a division, add a team from the season view, and roster a player directly on the team page', async ({ browser, baseURL }) => {
    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    const adminEmail = uniqueEmail('pw-division-admin');

    await bootstrapSession(adminPage, {
      email: adminEmail,
      fullName: 'Playwright Division Admin',
      role: 'ADMIN',
    });

    const seasonName = `Playwright Season ${Date.now()}`;
    const seasonResponse = await adminPage.request.post('/api/seasons', {
      data: {
        name: seasonName,
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-06-30T00:00:00.000Z',
        minRosterSize: 8,
        maxRosterSize: 16,
        subQuota: 10,
      },
    });
    expect(seasonResponse.ok()).toBeTruthy();
    const createdSeason = await seasonResponse.json();
    const seasonId = createdSeason.id;

    await adminPage.goto(`/dashboard/seasons/${seasonId}`);

    const divisionName = `Premier ${Date.now()}`;
    await adminPage.getByTestId('division-name-input').fill(divisionName);
    await adminPage.getByTestId('division-level-input').fill('1');
    await adminPage.getByTestId('save-division-button').click();
    await expect(adminPage.getByText(divisionName)).toBeVisible();
    const divisionsResponse = await adminPage.request.get(`/api/divisions?seasonId=${seasonId}`);
    expect(divisionsResponse.ok()).toBeTruthy();
    const divisionsPayload = await divisionsResponse.json();
    const createdDivision = divisionsPayload.find((division: { name: string }) => division.name === divisionName);
    expect(createdDivision?.id).toBeTruthy();
    await expect(adminPage.getByTestId(`division-card-${createdDivision.id}`)).toContainText('No teams in this division yet.');

    await adminPage.getByTestId(`create-team-for-division-${createdDivision.id}`).click();
    await adminPage.waitForURL(/\/dashboard\/teams\/create/);
    const teamName = `Division FC ${Date.now()}`;
    await adminPage.getByPlaceholder('Enter team name').fill(teamName);
    await adminPage.getByTestId('team-season-select').selectOption(seasonId!);
    await adminPage.getByTestId('team-division-select').selectOption(createdDivision.id);
    await adminPage.getByRole('button', { name: 'Create Team' }).click();
    await adminPage.waitForURL((url) => /\/dashboard\/teams\/(?!create$)[^/]+$/.test(url.pathname));
    const createdTeamUrl = adminPage.url();
    const createdTeamId = createdTeamUrl.split('/').pop();
    expect(createdTeamId).toBeTruthy();

    const playerContext = await browser.newContext({ baseURL });
    const playerPage = await playerContext.newPage();
    const playerEmail = uniqueEmail('pw-admin-roster-player');

    await bootstrapSession(playerPage, {
      email: playerEmail,
      fullName: 'Playwright Assigned Player',
      role: 'PLAYER',
    });

    await adminPage.getByTestId('team-admin-search-input').fill(playerEmail);
    const assignButton = adminPage.getByTestId(/team-admin-assign-/).first();
    await expect(assignButton).toBeVisible();
    await assignButton.click();

    await adminPage.goto(createdTeamUrl);
    await expect(adminPage.getByTestId('team-roster-entry').filter({ hasText: 'Playwright Assigned Player' })).toBeVisible();
    await adminPage.goto(`/dashboard/seasons/${seasonId}`);
    await expect(adminPage.getByTestId(`season-team-card-${createdTeamId}`)).toContainText(teamName);

    await playerContext.close();
    await adminContext.close();
  });

  test('teams index routes create team and view roster actions to real pages', async ({ browser, baseURL }) => {
    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    const adminEmail = uniqueEmail('pw-team-index-admin');

    await bootstrapSession(adminPage, {
      email: adminEmail,
      fullName: 'Playwright Team Index Admin',
      role: 'ADMIN',
    });

    await adminPage.goto('/dashboard/teams/create');
    const teamName = `Index FC ${Date.now()}`;
    await adminPage.getByPlaceholder('Enter team name').fill(teamName);
    await adminPage.getByRole('button', { name: 'Create Team' }).click();
    await adminPage.waitForURL((url) => /\/dashboard\/teams\/(?!create$)[^/]+$/.test(url.pathname));
    const teamId = adminPage.url().split('/').pop();
    expect(teamId).toBeTruthy();

    await adminPage.goto('/teams');
    await adminPage.getByTestId('teams-page-create-link').click();
    await adminPage.waitForURL('**/dashboard/teams/create');

    await adminPage.goto('/teams');
    await adminPage.getByTestId(`teams-page-roster-link-${teamId}`).click();
    await adminPage.waitForURL(`**/dashboard/teams/${teamId}`);
    await expect(adminPage.getByRole('heading', { name: teamName })).toBeVisible();

    await adminContext.close();
  });

  test('captain/admin can approve and remove roster entries after a player requests to join', async ({ browser, baseURL }) => {
    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    const adminEmail = uniqueEmail('pw-team-admin');

    await bootstrapSession(adminPage, {
      email: adminEmail,
      fullName: 'Playwright Team Admin',
      role: 'ADMIN',
    });

    await adminPage.goto('/dashboard/teams/create');
    const teamName = `Roster FC ${Date.now()}`;
    await adminPage.getByPlaceholder('Enter team name').fill(teamName);
    await adminPage.getByRole('button', { name: 'Create Team' }).click();
    await adminPage.waitForURL((url) => /\/dashboard\/teams\/(?!create$)[^/]+$/.test(url.pathname));

    const teamUrl = adminPage.url();
    const teamId = teamUrl.split('/').pop();
    expect(teamId).toBeTruthy();

    const playerContext = await browser.newContext({ baseURL });
    const playerPage = await playerContext.newPage();
    const playerEmail = uniqueEmail('pw-team-player');

    await bootstrapSession(playerPage, {
      email: playerEmail,
      fullName: 'Playwright Team Player',
      role: 'PLAYER',
    });

    await playerPage.goto('/dashboard/teams/join');
    await playerPage.getByPlaceholder(/Enter invite code/i).fill(teamId!);
    await playerPage.getByRole('button', { name: 'Lookup' }).click();
    await expect(playerPage.getByTestId('team-lookup-result')).toBeVisible();
    await playerPage.getByRole('button', { name: /Request to Join/i }).click();
    await expect(playerPage.getByText(new RegExp(`Request sent to ${teamName}`))).toBeVisible();

    await adminPage.reload();
    const rosterEntry = adminPage.getByTestId('team-roster-entry').filter({ hasText: 'Playwright Team Player' }).first();
    await expect(rosterEntry).toBeVisible();
    await expect(rosterEntry).toContainText('PENDING');
    await rosterEntry.locator(`[data-testid^="approve-player-"]`).click();
    await expect(rosterEntry).toContainText('APPROVED');

    await rosterEntry.locator(`[data-testid^="remove-player-"]`).click();
    await expect(adminPage.getByText('Playwright Team Player')).toHaveCount(0);

    await playerContext.close();
    await adminContext.close();
  });
});
