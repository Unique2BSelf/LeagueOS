import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = {
  match: {
    findUnique: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

describe('GET /api/matches/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the requested match with team context', async () => {
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-1',
      status: 'SCHEDULED',
      scheduledAt: '2026-03-07T15:00:00.000Z',
      homeScore: 0,
      awayScore: 0,
      homeTeam: { id: 'team-1', name: 'Home FC', division: { name: 'Premier' } },
      awayTeam: { id: 'team-2', name: 'Away FC', division: { name: 'Premier' } },
      season: { id: 'season-1', name: 'Spring 2026' },
    });

    const { GET } = await import('@/app/api/matches/[id]/route');
    const response = await GET(
      new NextRequest('http://localhost/api/matches/match-1'),
      { params: Promise.resolve({ id: 'match-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.homeTeam.name).toBe('Home FC');
    expect(payload.awayTeam.name).toBe('Away FC');
  });
});
