import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  team: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Admin team archive API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives a team and records audit state', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    prismaMock.team.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Archive FC',
      approvalStatus: 'APPROVED',
      rosterStatus: 'FINALIZED',
      isConfirmed: true,
      isArchived: false,
      season: {
        id: 'season-1',
        name: 'Spring 2026',
        minRosterSize: 8,
        maxRosterSize: 16,
      },
      players: [{ status: 'APPROVED' }, { status: 'APPROVED' }],
    });

    prismaMock.team.update.mockResolvedValueOnce({
      id: 'team-1',
      approvalStatus: 'APPROVED',
      rosterStatus: 'FINALIZED',
      isConfirmed: true,
      isArchived: true,
    });

    const { PATCH } = await import('@/app/api/admin/teams/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/admin/teams', {
      method: 'PATCH',
      body: {
        teamIds: ['team-1'],
        action: 'ARCHIVE',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(expect.objectContaining({
      success: true,
      updated: 1,
      action: 'ARCHIVE',
    }));
    expect(prismaMock.team.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'team-1' },
      data: { isArchived: true },
    }));
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'UPDATE',
      entityType: 'TEAM',
      entityId: 'team-1',
      before: expect.objectContaining({ isArchived: false }),
      after: expect.objectContaining({ isArchived: true }),
    }));
  });
});
