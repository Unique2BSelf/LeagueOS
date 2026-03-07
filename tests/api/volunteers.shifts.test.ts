import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  volunteerShift: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('Volunteer shifts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs the current user up for an open volunteer shift', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'player-1',
      role: 'PLAYER',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'player-1',
      fullName: 'Volunteer Player',
      role: 'PLAYER',
      isActive: true,
    });
    prismaMock.volunteerShift.findUnique.mockResolvedValueOnce({
      id: 'shift-1',
      userId: null,
      eventId: 'event-1',
      role: 'ID_CHECKER',
      status: 'OPEN',
    });
    prismaMock.volunteerShift.update.mockResolvedValueOnce({
      id: 'shift-1',
      userId: 'player-1',
      eventId: 'event-1',
      eventName: 'Matchday Support',
      role: 'ID_CHECKER',
      date: new Date('2026-03-08T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '11:00',
      hours: 2,
      status: 'ASSIGNED',
      notes: null,
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      user: { fullName: 'Volunteer Player' },
    });

    const { POST } = await import('@/app/api/volunteers/shifts/route');
    const response = await POST(createJsonRequest('http://localhost/api/volunteers/shifts', {
      method: 'POST',
      body: { action: 'signup', shiftId: 'shift-1' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.shift).toMatchObject({
      id: 'shift-1',
      userId: 'player-1',
      userName: 'Volunteer Player',
      status: 'ASSIGNED',
    });
  });
});
