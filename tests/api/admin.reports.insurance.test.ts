import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRequest } from '../helpers/request';

const getAdminActorMock = vi.fn();
const buildInsuranceComplianceReportMock = vi.fn();
const convertInsuranceReportToCsvMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/admin-auth', () => ({ getAdminActor: getAdminActorMock }));
vi.mock('@/lib/insurance-report', () => ({
  buildInsuranceComplianceReport: buildInsuranceComplianceReportMock,
  convertInsuranceReportToCsv: convertInsuranceReportToCsvMock,
}));
vi.mock('@/lib/audit', () => ({ createAuditLog: createAuditLogMock }));

describe('Insurance admin reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks non-admin users from fetching the insurance report', async () => {
    getAdminActorMock.mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/admin/reports/insurance/route');
    const response = await GET(createJsonRequest('http://localhost/api/admin/reports/insurance'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Admin only' });
  });

  it('returns the filtered insurance report summary and rows for admins', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    buildInsuranceComplianceReportMock.mockResolvedValueOnce({
      rows: [
        {
          registrationId: 'reg-1',
          seasonName: 'Spring 2026',
          playerName: 'Alex Example',
          email: 'alex@example.com',
          paid: true,
          insuranceStatus: 'ACTIVE',
        },
      ],
      summary: {
        totalRows: 1,
        paidCount: 1,
        unpaidCount: 0,
        activeInsuranceCount: 1,
        expiringInsuranceCount: 0,
        expiredInsuranceCount: 0,
        missingInsuranceCount: 0,
      },
      filters: {
        seasonId: 'season-1',
        status: 'paid',
        dateFrom: null,
        dateTo: null,
      },
    });

    const { GET } = await import('@/app/api/admin/reports/insurance/route');
    const response = await GET(createJsonRequest('http://localhost/api/admin/reports/insurance?seasonId=season-1&status=paid'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.summary.totalRows).toBe(payload.rows.length);
    expect(buildInsuranceComplianceReportMock).toHaveBeenCalledWith(expect.objectContaining({
      seasonId: 'season-1',
      status: 'paid',
    }));
  });

  it('exports filtered insurance report rows as CSV and writes an audit log', async () => {
    getAdminActorMock.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    buildInsuranceComplianceReportMock.mockResolvedValueOnce({
      rows: [
        {
          registrationId: 'reg-1',
          seasonName: 'Spring 2026',
          playerName: 'Alex Example',
          email: 'alex@example.com',
          registrationStatus: 'APPROVED',
          paid: true,
          amount: 125,
          registeredAt: '2026-03-06T12:00:00.000Z',
          insuranceStatus: 'ACTIVE',
          insuranceEffectiveDate: '2026-01-01T00:00:00.000Z',
          insuranceExpiry: '2027-01-01T00:00:00.000Z',
          insuranceProvider: 'LEAGUE_PROVIDED',
        },
      ],
      summary: {
        totalRows: 1,
        paidCount: 1,
        unpaidCount: 0,
        activeInsuranceCount: 1,
        expiringInsuranceCount: 0,
        expiredInsuranceCount: 0,
        missingInsuranceCount: 0,
      },
      filters: {
        seasonId: 'season-1',
        status: 'paid',
        dateFrom: null,
        dateTo: null,
      },
    });
    convertInsuranceReportToCsvMock.mockReturnValueOnce('Season,Player Name\nSpring 2026,Alex Example');

    const { GET } = await import('@/app/api/admin/reports/insurance/export/route');
    const response = await GET(createJsonRequest('http://localhost/api/admin/reports/insurance/export?format=csv&seasonId=season-1&status=paid'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    await expect(response.text()).resolves.toContain('Alex Example');
    expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'EXPORT',
      entityType: 'REPORT',
      entityId: 'insurance-compliance',
    }));
  });
});
