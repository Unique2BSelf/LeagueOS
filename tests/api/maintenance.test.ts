import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  maintenanceLog: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  field: {
    findMany: vi.fn(),
  },
};

const getSessionFromRequestMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ getSessionFromRequest: getSessionFromRequestMock }));

describe('Maintenance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a persisted maintenance issue', async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: 'admin-1',
      role: 'ADMIN',
      expiresAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      fullName: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    });
    prismaMock.maintenanceLog.create.mockResolvedValueOnce({
      id: 'log-1',
      fieldId: 'field-1',
      issue: 'Broken corner flag',
      status: 'OPEN',
      priority: 'HIGH',
      notes: 'Needs replacement',
      reportedBy: 'Admin User',
      resolvedAt: null,
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      field: {
        id: 'field-1',
        name: 'Field 1',
        location: { name: 'Complex A' },
      },
    });

    const { POST } = await import('@/app/api/maintenance/route');
    const response = await POST(createJsonRequest('http://localhost/api/maintenance', {
      method: 'POST',
      body: {
        action: 'log',
        fieldId: 'field-1',
        issue: 'Broken corner flag',
        priority: 'HIGH',
        notes: 'Needs replacement',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.log).toMatchObject({
      id: 'log-1',
      fieldName: 'Field 1',
      locationName: 'Complex A',
      priority: 'HIGH',
    });
  });
});
