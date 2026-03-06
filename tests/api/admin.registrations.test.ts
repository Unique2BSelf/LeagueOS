import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  registration: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Admin registrations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes an audit log when an admin approves a registration', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    prismaMock.registration.findMany.mockResolvedValueOnce([
      {
        id: 'reg-1',
        status: 'PENDING',
        rejectionReason: null,
        paid: false,
        user: { email: 'alex@example.com', fullName: 'Alex Example' },
        season: { name: 'Spring 2026' },
      },
    ]);
    prismaMock.registration.update.mockResolvedValueOnce({
      id: 'reg-1',
      status: 'APPROVED',
      rejectionReason: null,
      paid: false,
      user: { email: 'alex@example.com', fullName: 'Alex Example' },
      season: { name: 'Spring 2026' },
    });

    const { PATCH } = await import('@/app/api/admin/registrations/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/admin/registrations', {
      method: 'PATCH',
      body: {
        registrationIds: ['reg-1'],
        action: 'APPROVE',
      },
    }));

    expect(response.status).toBe(200);
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'APPROVE',
      entityType: 'REGISTRATION',
      entityId: 'reg-1',
      before: expect.objectContaining({ status: 'PENDING' }),
      after: expect.objectContaining({ status: 'APPROVED' }),
    }));
  });
});
