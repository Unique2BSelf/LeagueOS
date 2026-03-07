import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  season: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  seasonRulesDocument: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Rules API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns published rules for a requested season', async () => {
    prismaMock.season.findMany.mockResolvedValueOnce([
      { id: 'season-1', name: 'Spring 2026', startDate: new Date('2026-03-01'), endDate: new Date('2026-06-01') },
    ]);
    prismaMock.seasonRulesDocument.findUnique.mockResolvedValueOnce({
      seasonId: 'season-1',
      title: 'Spring 2026 Rules',
      content: '1. Conduct\n- Be cool',
      summary: 'Short summary',
      effectiveDate: new Date('2026-03-01'),
      season: { id: 'season-1', name: 'Spring 2026', startDate: new Date('2026-03-01'), endDate: new Date('2026-06-01') },
    });

    const { GET } = await import('@/app/api/rules/route');
    const response = await GET(createJsonRequest('http://localhost/api/rules?seasonId=season-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.document).toEqual(expect.objectContaining({
      title: 'Spring 2026 Rules',
    }));
  });

  it('creates a rules document as an admin', async () => {
    getAdminActorMock.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    prismaMock.season.findUnique.mockResolvedValueOnce({
      id: 'season-1',
      name: 'Spring 2026',
    });
    prismaMock.seasonRulesDocument.findUnique.mockResolvedValueOnce(null);
    prismaMock.seasonRulesDocument.create.mockResolvedValueOnce({
      seasonId: 'season-1',
      title: 'Spring 2026 Rules',
      content: '1. Conduct\n- Be cool',
      summary: 'Short summary',
      effectiveDate: new Date('2026-03-01'),
      season: { id: 'season-1', name: 'Spring 2026', startDate: new Date('2026-03-01'), endDate: new Date('2026-06-01') },
    });

    const { POST } = await import('@/app/api/rules/route');
    const response = await POST(createJsonRequest('http://localhost/api/rules', {
      method: 'POST',
      body: {
        seasonId: 'season-1',
        title: 'Spring 2026 Rules',
        content: '1. Conduct\n- Be cool',
        summary: 'Short summary',
        effectiveDate: '2026-03-01',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.title).toBe('Spring 2026 Rules');
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'CREATE',
      entityType: 'SEASON',
      entityId: 'season-1',
    }));
  });
});
