import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  disciplinaryAction: {
    create: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('Match center API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a pending disciplinary action when a referee records a red card event', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'ref-1',
      role: 'REF',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'ref-1',
      role: 'REF',
    });
    prismaMock.disciplinaryAction.create.mockResolvedValueOnce({ id: 'discipline-1' });

    const { POST } = await import('@/app/api/match-center/route');
    const response = await POST(createJsonRequest('http://localhost/api/match-center', {
      method: 'POST',
      body: {
        matchId: 'match-1',
        action: 'record_event',
        type: 'RED_CARD',
        teamId: 'team-1',
        playerId: 'player-1',
        cardType: 'RED',
        fineAmount: 50,
        suspensionGames: 1,
        description: 'Studs up challenge',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.events).toHaveLength(1);
    expect(prismaMock.disciplinaryAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'player-1',
        matchId: 'match-1',
        cardType: 'RED',
        fineAmount: 50,
        suspensionGames: 1,
        source: 'MATCH_REPORT',
        reportedById: 'ref-1',
      }),
    });
  });
});
