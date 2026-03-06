import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  registration: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  registrationForm: {
    findUnique: vi.fn(),
  },
  insurancePolicy: {
    findFirst: vi.fn(),
  },
  season: {
    findUnique: vi.fn(),
  },
  discountCode: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

describe('POST /api/registrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects duplicate registrations for the same user and season', async () => {
    prismaMock.registration.findUnique.mockResolvedValueOnce({ id: 'existing-registration' });

    const { POST } = await import('@/app/api/registrations/route');
    const response = await POST(createJsonRequest('http://localhost/api/registrations', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: { seasonId: 'season-1', waiverAgreed: true },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Already registered for this season' });
  });

  it('enforces waiver acceptance when the registration form requires it', async () => {
    prismaMock.registration.findUnique.mockResolvedValueOnce(null);
    prismaMock.registrationForm.findUnique.mockResolvedValueOnce({
      seasonId: 'season-1',
      requireWaiver: true,
      baseFee: 150,
    });

    const { POST } = await import('@/app/api/registrations/route');
    const response = await POST(createJsonRequest('http://localhost/api/registrations', {
      method: 'POST',
      headers: { 'x-user-id': 'player-1' },
      body: { seasonId: 'season-1', waiverAgreed: false },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Waiver acceptance is required' });
    expect(prismaMock.registration.create).not.toHaveBeenCalled();
  });
});
