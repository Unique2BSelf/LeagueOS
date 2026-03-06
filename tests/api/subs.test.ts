import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  teamPlayer: {
    findMany: vi.fn(),
  },
  match: {
    findUnique: vi.fn(),
  },
  sub: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();
const checkSubEligibilityMock = vi.fn();
const calculateDivisionAverageEloMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));
vi.mock('@prisma/client', () => ({ SubRequestStatus: { OPEN: 'OPEN', CLAIMED: 'CLAIMED', CANCELLED: 'CANCELLED' } }));
vi.mock('@/lib/subEligibility', () => ({
  checkSubEligibility: checkSubEligibilityMock,
  calculateDivisionAverageElo: calculateDivisionAverageEloMock,
}));

describe('Sub requests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a sub request for a rostered player', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'requester-1',
      role: 'PLAYER',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'requester-1',
      fullName: 'Requester One',
      email: 'requester@test.local',
      role: 'PLAYER',
      isActive: true,
      isInsured: true,
      isGoalie: false,
      eloRating: 1200,
    });
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([
      { teamId: 'team-1', team: { division: { level: 2 } } },
    ]);
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeTeam: { name: 'Home FC' },
      awayTeam: { name: 'Away FC' },
    });
    prismaMock.sub.findFirst.mockResolvedValueOnce(null);
    prismaMock.sub.create.mockResolvedValueOnce({
      id: 'sub-1',
      matchId: 'match-1',
      teamId: 'team-1',
      status: 'OPEN',
    });

    const { POST } = await import('@/app/api/subs/route');
    const response = await POST(createJsonRequest('http://localhost/api/subs', {
      method: 'POST',
      body: { matchId: 'match-1' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ id: 'sub-1', status: 'OPEN', matchId: 'match-1' });
  });

  it('claims an eligible open sub request', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'claimant-1',
      role: 'PLAYER',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'claimant-1',
      fullName: 'Claimant One',
      email: 'claimant@test.local',
      role: 'PLAYER',
      isActive: true,
      isInsured: true,
      isGoalie: false,
      eloRating: 1300,
    });
    prismaMock.sub.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      matchId: 'match-1',
      requestedById: 'requester-1',
      teamId: 'team-1',
      status: 'OPEN',
      match: {
        homeTeam: { division: { level: 2 } },
        awayTeam: { division: { level: 2 } },
      },
    });
    prismaMock.teamPlayer.findMany
      .mockResolvedValueOnce([{ teamId: 'team-9', team: { divisionId: 'division-1', division: { level: 2 }, subQuotaRemaining: 10 } }])
      .mockResolvedValueOnce([{ user: { eloRating: 1200 } }, { user: { eloRating: 1300 } }]);
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      divisionId: 'division-1',
      division: { level: 2 },
      subQuotaRemaining: 10,
    });
    calculateDivisionAverageEloMock.mockReturnValueOnce(1250);
    checkSubEligibilityMock.mockReturnValueOnce({ eligible: true });
    prismaMock.sub.update.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'CLAIMED',
      claimedById: 'claimant-1',
    });

    const { PATCH } = await import('@/app/api/subs/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/subs', {
      method: 'PATCH',
      body: { id: 'sub-1', action: 'claim' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      id: 'sub-1',
      status: 'CLAIMED',
      claimedById: 'claimant-1',
    });
  });
});

