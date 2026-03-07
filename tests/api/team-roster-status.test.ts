import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Team roster lifecycle API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a captain to submit a roster once minimum count is reached', async () => {
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
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      captainId: 'captain-1',
      approvalStatus: 'APPROVED',
      rosterStatus: 'DRAFT',
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        minRosterSize: 8,
        maxRosterSize: 16,
      },
      players: Array.from({ length: 8 }, (_, index) => ({
        userId: `player-${index}`,
        status: 'APPROVED',
      })),
    });
    prismaMock.team.update.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Roster FC',
      rosterStatus: 'SUBMITTED',
      approvalStatus: 'APPROVED',
    });

    const { PATCH } = await import('@/app/api/teams/[id]/roster-status/route');
    const response = await PATCH(
      createJsonRequest('http://localhost/api/teams/team-1/roster-status', {
        method: 'PATCH',
        body: { rosterStatus: 'SUBMITTED' },
      }),
      { params: Promise.resolve({ id: 'team-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.rosterStatus).toBe('SUBMITTED');
    expect(createAuditLogMock).toHaveBeenCalled();
  });

  it('rejects finalization when the roster is below minimum size', async () => {
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
    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      captainId: 'captain-1',
      approvalStatus: 'APPROVED',
      rosterStatus: 'SUBMITTED',
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        minRosterSize: 8,
        maxRosterSize: 16,
      },
      players: Array.from({ length: 6 }, (_, index) => ({
        userId: `player-${index}`,
        status: 'APPROVED',
      })),
    });

    const { PATCH } = await import('@/app/api/teams/[id]/roster-status/route');
    const response = await PATCH(
      createJsonRequest('http://localhost/api/teams/team-1/roster-status', {
        method: 'PATCH',
        body: { rosterStatus: 'FINALIZED' },
      }),
      { params: Promise.resolve({ id: 'team-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/between 8 and 16/i);
    expect(prismaMock.team.update).not.toHaveBeenCalled();
  });
});
