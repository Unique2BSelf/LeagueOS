import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  insurancePolicy: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  registration: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

describe('POST /api/insurance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/insurance/route');
    const response = await POST(createJsonRequest('http://localhost/api/insurance', {
      method: 'POST',
      body: { provider: 'LEAGUE_PROVIDED' },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('creates a 365-day active policy and updates the user insurance state', async () => {
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce(null);
    prismaMock.insurancePolicy.create.mockImplementationOnce(async ({ data }) => ({
      id: 'policy-1',
      ...data,
    }));
    prismaMock.registration.findMany.mockResolvedValueOnce([
      { id: 'reg-1', paid: true, status: 'PENDING' },
      { id: 'reg-2', paid: false, status: 'PENDING' },
    ]);
    prismaMock.registration.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValueOnce({});

    const { POST } = await import('@/app/api/insurance/route');
    const response = await POST(createJsonRequest('http://localhost/api/insurance', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: { provider: 'LEAGUE_PROVIDED', cost: 50 },
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toContain('Insurance purchased successfully');
    expect(prismaMock.insurancePolicy.create).toHaveBeenCalled();

    const createCall = prismaMock.insurancePolicy.create.mock.calls[0][0];
    expect(createCall.data.userId).toBe('player-1');
    expect(createCall.data.status).toBe('ACTIVE');

    const days = Math.round((new Date(createCall.data.endDate).getTime() - new Date(createCall.data.startDate).getTime()) / (1000 * 60 * 60 * 24));
    expect(days).toBe(365);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'player-1' },
      data: expect.objectContaining({
        isInsured: true,
      }),
    });
    expect(prismaMock.registration.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'player-1',
        status: { not: 'REJECTED' },
      },
      select: {
        id: true,
        paid: true,
        status: true,
      },
    });
    expect(prismaMock.registration.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'reg-1' },
      data: expect.objectContaining({
        insuranceStatus: 'VALID',
        status: 'APPROVED',
      }),
    });
    expect(prismaMock.registration.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'reg-2' },
      data: expect.objectContaining({
        insuranceStatus: 'VALID',
        status: 'PENDING',
      }),
    });
  });
});
