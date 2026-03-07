import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
  },
  teamPlayer: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Team roster management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a captain to approve a pending roster request', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'captain-1',
      role: 'CAPTAIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'captain-1',
      email: 'captain@example.com',
      role: 'CAPTAIN',
      fullName: 'Captain One',
      isActive: true,
    });
    prismaMock.team.findUnique
      .mockResolvedValueOnce({ captainId: 'captain-1' })
      .mockResolvedValueOnce({
        captainId: 'captain-1',
        rosterStatus: 'DRAFT',
        season: {
          id: 'season-1',
          name: 'Spring 2026',
          minRosterSize: 8,
          maxRosterSize: 16,
        },
      });
    prismaMock.teamPlayer.count.mockResolvedValueOnce(4);
    prismaMock.teamPlayer.findUnique.mockResolvedValueOnce({
      userId: 'player-1',
      teamId: 'team-1',
      status: 'PENDING',
    });
    prismaMock.teamPlayer.update.mockResolvedValueOnce({
      userId: 'player-1',
      teamId: 'team-1',
      status: 'APPROVED',
      user: {
        fullName: 'Player One',
        email: 'player@example.com',
        role: 'PLAYER',
      },
    });

    const { PATCH } = await import('@/app/api/teams/[id]/players/route');
    const response = await PATCH(
      createJsonRequest('http://localhost/api/teams/team-1/players', {
        method: 'PATCH',
        body: { userId: 'player-1', action: 'APPROVE' },
      }),
      { params: Promise.resolve({ id: 'team-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('APPROVED');
    expect(prismaMock.teamPlayer.update).toHaveBeenCalled();
    expect(createAuditLogMock).toHaveBeenCalled();
  });

  it('prevents removing the team captain from the roster route', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'admin-1',
      role: 'ADMIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      fullName: 'Admin One',
      isActive: true,
    });
    prismaMock.teamPlayer.findUnique.mockResolvedValueOnce({
      userId: 'captain-1',
      teamId: 'team-1',
      status: 'APPROVED',
    });
    prismaMock.team.findUnique.mockResolvedValueOnce({
      captainId: 'captain-1',
      rosterStatus: 'DRAFT',
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        minRosterSize: 8,
        maxRosterSize: 16,
      },
    });

    const { PATCH } = await import('@/app/api/teams/[id]/players/route');
    const response = await PATCH(
      createJsonRequest('http://localhost/api/teams/team-1/players', {
        method: 'PATCH',
        body: { userId: 'captain-1', action: 'REMOVE' },
      }),
      { params: Promise.resolve({ id: 'team-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/captain cannot be removed/i);
    expect(prismaMock.teamPlayer.delete).not.toHaveBeenCalled();
  });

  it('blocks captains from changing a finalized roster until it is reopened', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'captain-1',
      role: 'CAPTAIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'captain-1',
      email: 'captain@example.com',
      role: 'CAPTAIN',
      fullName: 'Captain One',
      isActive: true,
    });
    prismaMock.team.findUnique
      .mockResolvedValueOnce({ captainId: 'captain-1' })
      .mockResolvedValueOnce({
        captainId: 'captain-1',
        rosterStatus: 'FINALIZED',
        season: {
          id: 'season-1',
          name: 'Spring 2026',
          minRosterSize: 8,
          maxRosterSize: 16,
        },
      });
    prismaMock.teamPlayer.findUnique.mockResolvedValueOnce({
      userId: 'player-1',
      teamId: 'team-1',
      status: 'PENDING',
    });

    const { PATCH } = await import('@/app/api/teams/[id]/players/route');
    const response = await PATCH(
      createJsonRequest('http://localhost/api/teams/team-1/players', {
        method: 'PATCH',
        body: { userId: 'player-1', action: 'APPROVE' },
      }),
      { params: Promise.resolve({ id: 'team-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/finalized/i);
    expect(prismaMock.teamPlayer.update).not.toHaveBeenCalled();
  });
});
