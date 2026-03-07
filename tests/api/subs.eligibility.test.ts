import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  teamPlayer: {
    findMany: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
  },
  match: {
    findUnique: vi.fn(),
  },
  sub: {
    findUnique: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('Sub eligibility API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns real eligibility for the authenticated player and request context', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'player-1',
      role: 'PLAYER',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'player-1',
        role: 'PLAYER',
        isActive: true,
        isInsured: true,
        isGoalie: false,
        eloRating: 1325,
      })
      .mockResolvedValueOnce({
        id: 'player-1',
        fullName: 'Eligible Player',
        isActive: true,
        isInsured: true,
        isGoalie: false,
        eloRating: 1325,
      });
    prismaMock.sub.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      matchId: 'match-1',
      teamId: 'team-1',
      status: 'OPEN',
    });
    prismaMock.teamPlayer.findMany
      .mockResolvedValueOnce([
        {
          team: {
            division: { level: 2 },
          },
        },
      ])
      .mockResolvedValueOnce([
        { user: { eloRating: 1200 } },
        { user: { eloRating: 1300 } },
        { user: { eloRating: 1400 } },
      ]);
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Blue FC',
      divisionId: 'division-1',
      division: { level: 2 },
      subQuotaRemaining: 4,
    });
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      scheduledAt: new Date('2026-03-10T20:00:00.000Z'),
      homeTeam: { name: 'Blue FC' },
      awayTeam: { name: 'Red FC' },
    });

    const { GET } = await import('@/app/api/subs/eligibility/route');
    const response = await GET(new Request('http://localhost/api/subs/eligibility?subId=sub-1') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.rules.standard).toBe('1-Down / Any-Up');
    expect(payload.subRequest).toEqual({ id: 'sub-1', status: 'OPEN' });
    expect(payload.eligibility).toMatchObject({
      eligible: true,
      player: {
        id: 'player-1',
        fullName: 'Eligible Player',
        homeDivision: 2,
      },
      team: {
        id: 'team-1',
        name: 'Blue FC',
        divisionLevel: 2,
      },
      match: {
        id: 'match-1',
        homeTeam: 'Blue FC',
        awayTeam: 'Red FC',
      },
    });
  });

  it('allows admin previewing eligibility for another player', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'admin-1',
      role: 'ADMIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: true,
        isInsured: true,
        isGoalie: false,
        eloRating: 1500,
      })
      .mockResolvedValueOnce({
        id: 'player-2',
        fullName: 'Uninsured Player',
        isActive: true,
        isInsured: false,
        isGoalie: false,
        eloRating: 1200,
      });
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([
      {
        team: {
          division: { level: 2 },
        },
      },
    ]);
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Blue FC',
      divisionId: 'division-1',
      division: { level: 2 },
      subQuotaRemaining: 4,
    });
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      scheduledAt: new Date('2026-03-10T20:00:00.000Z'),
      homeTeam: { name: 'Blue FC' },
      awayTeam: { name: 'Red FC' },
    });
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([]);

    const { POST } = await import('@/app/api/subs/eligibility/route');
    const response = await POST(createJsonRequest('http://localhost/api/subs/eligibility', {
      method: 'POST',
      body: { matchId: 'match-1', teamId: 'team-1', playerId: 'player-2' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.eligibility).toMatchObject({
      eligible: false,
      reason: 'Player must be insured to request subs',
    });
  });
});
