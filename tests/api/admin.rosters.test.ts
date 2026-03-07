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
    count: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Admin roster assignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('directly assigns a player to a team without an invite code', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'player-1',
      fullName: 'Player One',
      email: 'player@example.com',
      isActive: true,
    });
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Roster FC',
      seasonId: 'season-1',
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        maxRosterSize: 16,
      },
      division: {
        id: 'division-1',
        name: 'Premier',
        level: 1,
      },
    });
    prismaMock.teamPlayer.count.mockResolvedValueOnce(8);
    prismaMock.teamPlayer.findUnique.mockResolvedValueOnce(null);
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([]);
    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        teamPlayer: {
          create: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
        },
      }),
    );

    const { PATCH } = await import('@/app/api/admin/rosters/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/admin/rosters', {
      method: 'PATCH',
      body: {
        userId: 'player-1',
        teamId: 'team-1',
        action: 'ASSIGN',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.team.name).toBe('Roster FC');
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'TEAM',
      entityId: 'team-1',
    }));
  });

  it('requires MOVE when the player is already approved on another team in the same season', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'player-1',
      fullName: 'Player One',
      email: 'player@example.com',
      isActive: true,
    });
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-2',
      name: 'New Club',
      seasonId: 'season-1',
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        maxRosterSize: 16,
      },
      division: {
        id: 'division-1',
        name: 'Premier',
        level: 1,
      },
    });
    prismaMock.teamPlayer.count.mockResolvedValueOnce(4);
    prismaMock.teamPlayer.findUnique.mockResolvedValueOnce(null);
    prismaMock.teamPlayer.findMany.mockResolvedValueOnce([
      {
        userId: 'player-1',
        teamId: 'team-1',
        status: 'APPROVED',
        team: {
          id: 'team-1',
          name: 'Existing Club',
        },
      },
    ]);

    const { PATCH } = await import('@/app/api/admin/rosters/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/admin/rosters', {
      method: 'PATCH',
      body: {
        userId: 'player-1',
        teamId: 'team-2',
        action: 'ASSIGN',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/use move/i);
  });
});
