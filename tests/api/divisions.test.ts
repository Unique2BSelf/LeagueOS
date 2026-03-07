import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  division: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  season: {
    findUnique: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Division API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a division for a season as an admin', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    prismaMock.season.findUnique.mockResolvedValueOnce({
      id: 'season-1',
      name: 'Spring 2026',
    });
    prismaMock.division.findFirst.mockResolvedValueOnce(null);
    prismaMock.division.create.mockResolvedValueOnce({
      id: 'division-1',
      seasonId: 'season-1',
      name: 'Premier',
      level: 1,
    });

    const { POST } = await import('@/app/api/divisions/route');
    const response = await POST(createJsonRequest('http://localhost/api/divisions', {
      method: 'POST',
      body: {
        seasonId: 'season-1',
        name: 'Premier',
        level: 1,
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.name).toBe('Premier');
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'CREATE',
      entityType: 'DIVISION',
      entityId: 'division-1',
    }));
  });

  it('blocks deleting a division when teams already exist in it', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    prismaMock.division.findUnique.mockResolvedValueOnce({
      id: 'division-1',
      seasonId: 'season-1',
      name: 'Premier',
      level: 1,
      season: { name: 'Spring 2026' },
      teams: [{ id: 'team-1' }],
    });

    const { DELETE } = await import('@/app/api/divisions/route');
    const response = await DELETE(createJsonRequest('http://localhost/api/divisions?id=division-1', {
      method: 'DELETE',
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/cannot delete a division with teams/i);
  });
});
