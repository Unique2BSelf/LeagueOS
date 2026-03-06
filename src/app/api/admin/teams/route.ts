import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';

// GET /api/admin/teams - List all teams for admin (with filters)
export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const seasonId = searchParams.get('seasonId');

    const where: Record<string, unknown> = {};
    if (status) where.approvalStatus = status;
    if (seasonId) where.seasonId = seasonId;

    const allTeams = await prisma.team.findMany({
      where,
      include: {
        season: true,
        division: true,
        players: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// PATCH /api/admin/teams - Approve or reject teams
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { teamIds, action, rejectionReason } = body; // action: 'APPROVE' | 'REJECT'

    if (!teamIds || !action) {
      return NextResponse.json({ error: 'teamIds and action required' }, { status: 400 });
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason required for rejection' }, { status: 400 });
    }

    const results = [];

    for (const teamId of teamIds) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (team) {
        const updated = await prisma.team.update({
          where: { id: teamId },
          data: action === 'APPROVE'
            ? {
                approvalStatus: 'APPROVED',
                isConfirmed: true,
                rejectionReason: null,
              }
            : {
                approvalStatus: 'REJECTED',
                rejectionReason,
              },
        });
        results.push(updated);
      }
    }

    // Send mock emails for each team
    for (const team of results) {
      const mockEmail = {
        to: `captain-${team.captainId}@example.com`,
        subject: action === 'APPROVE' 
          ? `Team Approved - ${team.name}` 
          : `Team Application Not Approved - ${team.name}`,
        body: action === 'APPROVE'
          ? `Hi Captain,\n\nYour team "${team.name}" has been approved!\n\nYou can now manage your team and invite players.\n\nThank you,\nLeague OS`
          : `Hi Captain,\n\nUnfortunately, your team "${team.name}" application was not approved.\n\nReason: ${rejectionReason}\n\nPlease contact support if you have questions.\n\nThank you,\nLeague OS`,
      };
      console.log('[MOCK EMAIL SENT]', mockEmail);
    }

    return NextResponse.json({ success: true, updated: results.length });
  } catch (error) {
    console.error('Error updating teams:', error);
    return NextResponse.json({ error: 'Failed to update teams' }, { status: 500 });
  }
}
