import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  season: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Season API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks non-admin users from creating seasons', async () => {
    getAdminActorMock.mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/seasons/route');
    const response = await POST(createJsonRequest('http://localhost/api/seasons', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: {
        name: 'Spring 2026',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
      },
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Admin only' });
  });

  it('returns newly created seasons in the season listing flow', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    prismaMock.season.create.mockResolvedValueOnce({
      id: 'season-1',
      name: 'Spring 2026',
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      endDate: new Date('2026-06-01T00:00:00.000Z'),
      scoringSystem: 'TRADITIONAL',
      minRosterSize: 8,
      maxRosterSize: 16,
      subQuota: 10,
      isArchived: false,
    });

    prismaMock.season.findMany.mockResolvedValueOnce([
      {
        id: 'season-1',
        name: 'Spring 2026',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
        divisions: [],
        teams: [],
      },
    ]);

    const seasonsRoute = await import('@/app/api/seasons/route');
    const createResponse = await seasonsRoute.POST(createJsonRequest('http://localhost/api/seasons', {
      method: 'POST',
      body: {
        name: 'Spring 2026',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
      },
    }));

    expect(createResponse.status).toBe(200);
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'CREATE',
      entityType: 'SEASON',
      entityId: 'season-1',
    }));

    const listResponse = await seasonsRoute.GET(createJsonRequest('http://localhost/api/seasons'));
    const seasons = await listResponse.json();

    expect(Array.isArray(seasons)).toBe(true);
    expect(seasons[0]).toEqual(expect.objectContaining({
      id: 'season-1',
      name: 'Spring 2026',
    }));
  });
});
