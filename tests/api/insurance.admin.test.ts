import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  insurancePolicy: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Insurance admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes an audit log when bulk insurance purchase succeeds', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce(null);
    prismaMock.insurancePolicy.create.mockResolvedValueOnce({
      id: 'policy-1',
      userId: 'player-1',
      provider: 'LEAGUE_PROVIDED',
      startDate: new Date('2026-03-06T00:00:00.000Z'),
      endDate: new Date('2027-03-06T00:00:00.000Z'),
      cost: 50,
      status: 'ACTIVE',
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const { POST } = await import('@/app/api/insurance/admin/route');
    const response = await POST(createJsonRequest('http://localhost/api/insurance/admin', {
      method: 'POST',
      body: {
        action: 'purchase_bulk',
        playerIds: ['player-1'],
        cost: 50,
      },
    }));

    expect(response.status).toBe(200);
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'ACTIVATE',
      entityType: 'INSURANCE_POLICY',
      entityId: 'policy-1',
    }));
  });
});
