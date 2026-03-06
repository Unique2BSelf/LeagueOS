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
  matchAvailability: {
    upsert: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));
vi.mock('@prisma/client', () => ({ AvailabilityStatus: { YES: 'YES', NO: 'NO', MAYBE: 'MAYBE' } }));

describe('Availability API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores availability for a rostered player', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'user-1',
      role: 'PLAYER',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      fullName: 'Player One',
      role: 'PLAYER',
      isActive: true,
    });
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
    });
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([{ teamId: 'team-1' }]);
    prismaMock.matchAvailability.upsert.mockResolvedValueOnce({
      userId: 'user-1',
      matchId: 'match-1',
      status: 'NO',
    });

    const { POST } = await import('@/app/api/availability/route');
    const response = await POST(createJsonRequest('http://localhost/api/availability', {
      method: 'POST',
      body: { matchId: 'match-1', status: 'NO' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.availability).toEqual({
      matchId: 'match-1',
      userId: 'user-1',
      status: 'NO',
    });
    expect(prismaMock.matchAvailability.upsert).toHaveBeenCalled();
  });
});

