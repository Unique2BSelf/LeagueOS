import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  matchEvent: {
    create: vi.fn(),
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
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      status: 'LIVE',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeScore: 0,
      awayScore: 0,
      currentMinute: 10,
      checklistDone: true,
      fieldInspected: true,
      playerCardsChecked: true,
      teamsPresent: true,
      refereeConfirmed: true,
      startedAt: null,
      endedAt: null,
      weatherStatus: null,
      reportNotes: null,
      homeTeam: { name: 'Home FC' },
      awayTeam: { name: 'Away FC' },
      events: [],
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'ref-1',
      role: 'REF',
    });
    prismaMock.matchEvent.create.mockResolvedValueOnce({
      id: 'event-1',
      type: 'RED_CARD',
      minute: 10,
      teamId: 'team-1',
      playerId: 'player-1',
      playerName: null,
      description: 'Studs up challenge',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    prismaMock.match.update.mockResolvedValueOnce({
      id: 'match-1',
      status: 'LIVE',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeScore: 0,
      awayScore: 0,
      currentMinute: 10,
      checklistDone: true,
      fieldInspected: true,
      playerCardsChecked: true,
      teamsPresent: true,
      refereeConfirmed: true,
      startedAt: null,
      endedAt: null,
      weatherStatus: null,
      reportNotes: null,
      homeTeam: { name: 'Home FC' },
      awayTeam: { name: 'Away FC' },
      events: [{
        id: 'event-1',
        type: 'RED_CARD',
        minute: 10,
        teamId: 'team-1',
        playerId: 'player-1',
        playerName: null,
        description: 'Studs up challenge',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
      }],
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
    expect(prismaMock.matchEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        matchId: 'match-1',
        type: 'RED_CARD',
        teamId: 'team-1',
        playerId: 'player-1',
      }),
    });
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
