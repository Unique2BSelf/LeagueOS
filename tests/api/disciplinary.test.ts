import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  disciplinaryAction: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();
const createAuditLogMock = vi.fn();
const syncDisciplinaryStateForUserMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));
vi.mock('@/lib/discipline', () => ({
  syncDisciplinaryStateForUser: syncDisciplinaryStateForUserMock,
}));

describe('Disciplinary API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a referee to create a pending disciplinary report', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'ref-1',
      role: 'REF',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'ref-1',
        email: 'ref@example.com',
        fullName: 'Ref One',
        role: 'REF',
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 'player-1',
        fullName: 'Player One',
      });
    prismaMock.disciplinaryAction.create.mockResolvedValueOnce({
      id: 'discipline-1',
      userId: 'player-1',
      status: 'PENDING_REVIEW',
    });

    const { POST } = await import('@/app/api/disciplinary/route');
    const response = await POST(createJsonRequest('http://localhost/api/disciplinary', {
      method: 'POST',
      body: {
        userId: 'player-1',
        matchId: 'match-1',
        cardType: 'RED',
        fineAmount: 50,
        suspensionGames: 1,
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.status).toBe('PENDING_REVIEW');
    expect(prismaMock.disciplinaryAction.create).toHaveBeenCalled();
  });

  it('approves a disciplinary action and creates a fine ledger entry', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'admin-1',
      role: 'ADMIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    });
    prismaMock.disciplinaryAction.findUnique.mockResolvedValueOnce({
      id: 'discipline-1',
      userId: 'player-1',
      matchId: 'match-1',
      cardType: 'RED',
      status: 'PENDING_REVIEW',
      fineAmount: 50,
      fineLedgerId: null,
    });
    prismaMock.ledger.create.mockResolvedValueOnce({ id: 'ledger-1' });
    prismaMock.disciplinaryAction.update.mockResolvedValueOnce({
      id: 'discipline-1',
      userId: 'player-1',
      status: 'APPROVED',
      fineLedgerId: 'ledger-1',
    });

    const { PATCH } = await import('@/app/api/disciplinary/route');
    const response = await PATCH(createJsonRequest('http://localhost/api/disciplinary', {
      method: 'PATCH',
      body: {
        actionId: 'discipline-1',
        action: 'APPROVE',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('APPROVED');
    expect(prismaMock.ledger.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'player-1',
        type: 'FINE',
      }),
    }));
    expect(syncDisciplinaryStateForUserMock).toHaveBeenCalledWith('player-1');
  });
});
