import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/teams - List all teams for admin (with filters)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const seasonId = searchParams.get('seasonId');

    // For now, we use in-memory storage for teams (as per the existing API)
    // In production, this would query the database
    const { teams } = await import('@/app/api/teams/route');
    let allTeams = Array.from(teams.values());

    if (status) {
      allTeams = allTeams.filter((t: any) => t.approvalStatus === status);
    }
    if (seasonId) {
      allTeams = allTeams.filter((t: any) => t.seasonId === seasonId);
    }

    return NextResponse.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// PATCH /api/admin/teams - Approve or reject teams
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
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

    // Use in-memory storage for teams
    const { teams } = await import('@/app/api/teams/route');
    const results = [];

    for (const teamId of teamIds) {
      const team = teams.get(teamId);
      if (team) {
        if (action === 'APPROVE') {
          team.approvalStatus = 'APPROVED';
          team.isConfirmed = true;
          team.rejectionReason = null;
        } else {
          team.approvalStatus = 'REJECTED';
          team.rejectionReason = rejectionReason;
        }
        teams.set(teamId, team);
        results.push(team);
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
