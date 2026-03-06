import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findMany: vi.fn(),
  },
  outboundEmail: {
    findMany: vi.fn(),
  },
  season: {
    findMany: vi.fn(),
  },
  division: {
    findMany: vi.fn(),
  },
  team: {
    findMany: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();
const queueAndSendEmailMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));
vi.mock('@/lib/email', () => ({ queueAndSendEmail: queueAndSendEmailMock }));

describe('Admin communications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks non-admin users', async () => {
    getAdminActorMock.mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/admin/communications/route');
    const response = await POST(createJsonRequest('http://localhost/api/admin/communications', {
      method: 'POST',
      body: {
        audienceType: 'ALL_PLAYERS',
        subject: 'Test',
        message: 'Hello',
      },
    }));

    expect(response.status).toBe(403);
  });

  it('sends an admin broadcast to deduped recipients and audits it', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin',
      role: 'ADMIN',
    });
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: 'u1', fullName: 'Alex', email: 'alex@example.com' },
      { id: 'u2', fullName: 'Alex Duplicate', email: 'alex@example.com' },
      { id: 'u3', fullName: 'Jamie', email: 'jamie@example.com' },
    ]);
    queueAndSendEmailMock.mockResolvedValue({ id: 'mail-1', status: 'SENT' });

    const { POST } = await import('@/app/api/admin/communications/route');
    const response = await POST(createJsonRequest('http://localhost/api/admin/communications', {
      method: 'POST',
      body: {
        audienceType: 'ALL_PLAYERS',
        subject: 'League Update',
        message: 'Hello players',
      },
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.recipientCount).toBe(2);
    expect(queueAndSendEmailMock).toHaveBeenCalledTimes(2);
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'SEND',
      entityType: 'COMMUNICATION',
    }));
  });
});
