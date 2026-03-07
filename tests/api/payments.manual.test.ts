import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  registration: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
  },
  payment: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

describe('POST /api/payments/manual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a completed manual payment for a pending registration', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' });
    prismaMock.registration.findUnique.mockResolvedValueOnce({
      id: 'reg-1',
      userId: 'player-1',
      seasonId: 'season-1',
      paid: false,
      season: { name: 'Spring 2026' },
    });
    prismaMock.payment.create.mockResolvedValueOnce({
      id: 'payment-1',
      registrationId: 'reg-1',
      amount: 150,
      method: 'CASH',
      status: 'COMPLETED',
    });
    prismaMock.registration.update.mockResolvedValueOnce({});
    prismaMock.ledger.create.mockResolvedValueOnce({});

    const { POST } = await import('@/app/api/payments/manual/route');
    const response = await POST(createJsonRequest('http://localhost/api/payments/manual', {
      method: 'POST',
      headers: { 'x-user-id': 'admin-1' },
      body: {
        registrationId: 'reg-1',
        amount: 150,
        paymentMethod: 'CASH',
        notes: 'Paid at field',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.payment.id).toBe('payment-1');
    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        paid: true,
        paymentId: 'payment-1',
        status: 'APPROVED',
      },
    });
  });
});
