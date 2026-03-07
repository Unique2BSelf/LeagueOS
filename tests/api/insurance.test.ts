import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  insurancePolicy: {
    findFirst: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  payment: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

const stripeSessionCreateMock = vi.fn();
const getStripeClientMock = vi.fn(() => ({
  checkout: {
    sessions: {
      create: stripeSessionCreateMock,
    },
  },
}));
const getRequestOriginMock = vi.fn(() => 'https://dev.corridor.soccer');

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/stripe', () => ({
  getStripeClient: getStripeClientMock,
  getRequestOrigin: getRequestOriginMock,
}));

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

  it('creates a Stripe Checkout session for annual insurance', async () => {
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      fullName: 'Player One',
      email: 'player@example.com',
    });
    prismaMock.payment.create.mockResolvedValueOnce({
      id: 'payment-1',
    });
    prismaMock.payment.update.mockResolvedValueOnce({
      id: 'payment-1',
      stripeSessionId: 'cs_ins_123',
    });
    stripeSessionCreateMock.mockResolvedValueOnce({
      id: 'cs_ins_123',
      url: 'https://checkout.stripe.test/insurance/123',
    });

    const { POST } = await import('@/app/api/insurance/route');
    const response = await POST(createJsonRequest('http://localhost/api/insurance', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: { provider: 'LEAGUE_PROVIDED', cost: 50 },
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.checkoutUrl).toBe('https://checkout.stripe.test/insurance/123');
    expect(payload.stripeSessionId).toBe('cs_ins_123');
    expect(payload.paymentId).toBe('payment-1');
    expect(stripeSessionCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      metadata: expect.objectContaining({
        paymentId: 'payment-1',
        paymentKind: 'INSURANCE',
        userId: 'player-1',
        provider: 'LEAGUE_PROVIDED',
      }),
    }));
  });
});
