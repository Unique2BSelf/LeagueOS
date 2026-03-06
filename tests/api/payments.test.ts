import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  registration: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
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

describe('POST /api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Stripe Checkout session for an unpaid registration', async () => {
    prismaMock.registration.findUnique.mockResolvedValueOnce({
      id: 'registration-1',
      userId: 'player-1',
      seasonId: 'season-1',
      paid: false,
      amount: 150,
      season: { name: 'Spring 2026' },
      user: { fullName: 'Test Player', email: 'player@example.com' },
    });
    stripeSessionCreateMock.mockResolvedValueOnce({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session/123',
    });

    const { POST } = await import('@/app/api/payments/route');
    const response = await POST(createJsonRequest('https://dev.corridor.soccer/api/payments', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: { registrationId: 'registration-1', method: 'CARD' },
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.checkoutUrl).toBe('https://checkout.stripe.test/session/123');
    expect(payload.stripeSessionId).toBe('cs_test_123');
    expect(stripeSessionCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      metadata: expect.objectContaining({
        registrationId: 'registration-1',
        seasonId: 'season-1',
        userId: 'player-1',
      }),
    }));
  });
});
