import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  auditLog: {
    findMany: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));

describe('Admin audit logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks non-admin users from reading audit logs', async () => {
    getAdminActorMock.mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/admin/audit-logs/route');
    const response = await GET(createJsonRequest('http://localhost/api/admin/audit-logs'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Admin only' });
  });

  it('returns filtered audit logs for admin users', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    prismaMock.auditLog.findMany.mockResolvedValueOnce([
      {
        id: 'log-1',
        actorUserId: 'admin-1',
        actorEmail: 'admin@example.com',
        actionType: 'CREATE',
        entityType: 'SEASON',
        entityId: 'season-1',
        before: null,
        after: { name: 'Spring 2026' },
        notes: null,
        createdAt: new Date('2026-03-06T12:00:00.000Z'),
      },
    ]);

    const { GET } = await import('@/app/api/admin/audit-logs/route');
    const response = await GET(createJsonRequest('http://localhost/api/admin/audit-logs?actionType=CREATE&entityType=SEASON'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.logs).toHaveLength(1);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        actionType: 'CREATE',
        entityType: 'SEASON',
      }),
    }));
  });
});
