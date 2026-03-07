import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  backgroundCheck: {
    findFirst: vi.fn(),
  },
  officialCertification: {
    findFirst: vi.fn(),
  },
  ledger: {
    aggregate: vi.fn(),
  },
  field: {
    findMany: vi.fn(),
  },
  match: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('Ref jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists scheduled open jobs and claimed jobs for the signed-in ref', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'ref-1',
      role: 'REF',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'ref-1',
      fullName: 'Ref One',
      email: 'ref@test.local',
      role: 'REF',
      isActive: true,
    });
    prismaMock.match.findMany.mockResolvedValueOnce([
      {
        id: 'match-open',
        scheduledAt: new Date('2026-03-10T18:00:00.000Z'),
        status: 'SCHEDULED',
        refId: null,
        fieldId: 'field-1',
        homeTeam: { name: 'Blue FC', division: { level: 1 } },
        awayTeam: { name: 'Red FC', division: { level: 1 } },
      },
      {
        id: 'match-claimed',
        scheduledAt: new Date('2026-03-10T20:00:00.000Z'),
        status: 'SCHEDULED',
        refId: 'ref-1',
        fieldId: 'field-2',
        homeTeam: { name: 'Gold FC', division: { level: 2 } },
        awayTeam: { name: 'Black FC', division: { level: 2 } },
      },
    ]);
    prismaMock.field.findMany.mockResolvedValueOnce([
      { id: 'field-1', name: 'Field 1', location: { name: 'Complex A' } },
      { id: 'field-2', name: 'Field 2', location: { name: 'Complex A' } },
    ]);
    prismaMock.backgroundCheck.findFirst.mockResolvedValueOnce({
      status: 'CLEAR',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    });
    prismaMock.officialCertification.findFirst.mockResolvedValueOnce({
      status: 'ACTIVE',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      certificationType: 'USSF',
    });
    prismaMock.ledger.aggregate.mockResolvedValueOnce({
      _sum: { amount: 120 },
      _count: { id: 2 },
    });

    const { GET } = await import('@/app/api/ref/jobs/route');
    const response = await GET(new Request('http://localhost/api/ref/jobs?status=all') as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobs).toHaveLength(2);
    expect(payload.jobs[0]).toMatchObject({
      id: 'match-open',
      status: 'OPEN',
      pay: 75,
    });
    expect(payload.jobs[1]).toMatchObject({
      id: 'match-claimed',
      status: 'CLAIMED',
      pay: 60,
    });
    expect(payload.refProfile).toMatchObject({
      backgroundCheckStatus: 'CLEAR',
      certificationUploaded: true,
    });
  });

  it('claims a scheduled match when the ref is eligible', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'ref-1',
      role: 'REF',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'ref-1',
      fullName: 'Ref One',
      email: 'ref@test.local',
      role: 'REF',
      isActive: true,
    });
    prismaMock.backgroundCheck.findFirst.mockResolvedValueOnce({
      status: 'CLEAR',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    });
    prismaMock.officialCertification.findFirst.mockResolvedValueOnce({
      status: 'ACTIVE',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      certificationType: 'USSF',
    });
    prismaMock.ledger.aggregate.mockResolvedValueOnce({
      _sum: { amount: 0 },
      _count: { id: 0 },
    });
    prismaMock.match.findUnique.mockResolvedValueOnce({
      id: 'match-open',
      status: 'SCHEDULED',
      refId: null,
      fieldId: 'field-1',
      homeTeam: { name: 'Blue FC', division: { level: 1 } },
      awayTeam: { name: 'Red FC', division: { level: 1 } },
    });
    prismaMock.match.update.mockResolvedValueOnce({
      id: 'match-open',
      scheduledAt: new Date('2026-03-10T18:00:00.000Z'),
      status: 'SCHEDULED',
      refId: 'ref-1',
      fieldId: 'field-1',
      homeTeam: { name: 'Blue FC', division: { level: 1 } },
      awayTeam: { name: 'Red FC', division: { level: 1 } },
    });
    prismaMock.field.findMany.mockResolvedValueOnce([
      { id: 'field-1', name: 'Field 1', location: { name: 'Complex A' } },
    ]);

    const { POST } = await import('@/app/api/ref/jobs/route');
    const response = await POST(createJsonRequest('http://localhost/api/ref/jobs', {
      method: 'POST',
      body: { jobId: 'match-open', action: 'claim' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.job).toMatchObject({
      id: 'match-open',
      status: 'CLAIMED',
    });
  });
});
