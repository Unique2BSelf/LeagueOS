import { NextRequest, NextResponse } from 'next/server';
import { getAdminActor } from '@/lib/admin-auth';
import { buildInsuranceComplianceReport } from '@/lib/insurance-report';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const report = await buildInsuranceComplianceReport({
      seasonId: searchParams.get('seasonId'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Insurance report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
