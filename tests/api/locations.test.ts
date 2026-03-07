import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const prismaMock = {
  location: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  field: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  match: {
    count: vi.fn(),
  },
};

const getAdminActorMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Locations and fields API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a location as an admin', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    prismaMock.location.create.mockResolvedValueOnce({
      id: 'loc-1',
      name: 'North Complex',
      address: '100 Soccer Way',
      latitude: 41.1,
      longitude: -87.1,
      fields: [],
    });

    const { POST } = await import('@/app/api/locations/route');
    const response = await POST(createJsonRequest('http://localhost/api/locations', {
      method: 'POST',
      body: {
        name: 'North Complex',
        address: '100 Soccer Way',
        latitude: 41.1,
        longitude: -87.1,
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.name).toBe('North Complex');
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'LOCATION',
      actionType: 'CREATE',
    }));
  });

  it('blocks deleting a field that has scheduled matches', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    prismaMock.field.findUnique.mockResolvedValueOnce({
      id: 'field-1',
      locationId: 'loc-1',
      name: 'Field A',
      qualityScore: 5,
      hasLights: true,
      location: { name: 'North Complex' },
    });
    prismaMock.match.count.mockResolvedValueOnce(2);

    const { DELETE } = await import('@/app/api/fields/route');
    const response = await DELETE(createJsonRequest('http://localhost/api/fields?id=field-1', { method: 'DELETE' }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/scheduled matches/i);
  });
});
