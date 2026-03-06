import { NextRequest, NextResponse } from 'next/server';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';
import { buildInsuranceComplianceReport, convertInsuranceReportToCsv } from '@/lib/insurance-report';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    if (format !== 'csv') {
      return NextResponse.json({ error: 'Only CSV export is supported right now' }, { status: 400 });
    }

    const report = await buildInsuranceComplianceReport({
      seasonId: searchParams.get('seasonId'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    });

    await createAuditLog({
      actor,
      actionType: 'EXPORT',
      entityType: 'REPORT',
      entityId: 'insurance-compliance',
      after: {
        filters: report.filters,
        rowCount: report.rows.length,
      },
      notes: 'Insurance compliance CSV export',
    });

    const csv = convertInsuranceReportToCsv(report.rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="insurance-compliance-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Insurance export error:', error);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}
