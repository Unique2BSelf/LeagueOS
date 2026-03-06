import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('getAdminActor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores forged x-user-id headers when no signed session exists', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce(null);

    const { getAdminActor } = await import('@/lib/admin-auth');
    const actor = await getAdminActor(createJsonRequest('http://localhost/api/admin/reports/insurance', {
      headers: { 'x-user-id': 'user-admin' },
    }));

    expect(actor).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('loads the admin actor from the signed session user id', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'user-admin',
      role: 'ADMIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-admin',
      email: 'admin@league.os',
      fullName: 'Admin User',
      role: 'ADMIN',
    });

    const { getAdminActor } = await import('@/lib/admin-auth');
    const actor = await getAdminActor(createJsonRequest('http://localhost/api/admin/reports/insurance'));

    expect(actor).toEqual({
      id: 'user-admin',
      email: 'admin@league.os',
      fullName: 'Admin User',
      role: 'ADMIN',
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-admin' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });
  });
});
