import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

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

// PATCH /api/admin/teams - Approve/reject teams or manage official roster lifecycle
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { teamIds, action, rejectionReason, rosterStatus } = body; // action: 'APPROVE' | 'REJECT' | 'SET_ROSTER_STATUS'

    if (!teamIds || !action) {
      return NextResponse.json({ error: 'teamIds and action required' }, { status: 400 });
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason required for rejection' }, { status: 400 });
    }

    if (action === 'SET_ROSTER_STATUS' && !['DRAFT', 'SUBMITTED', 'FINALIZED'].includes(rosterStatus)) {
      return NextResponse.json({ error: 'Valid rosterStatus is required for roster lifecycle updates' }, { status: 400 });
    }

    const results = [];

    for (const teamId of teamIds) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          season: {
            select: {
              id: true,
              name: true,
              minRosterSize: true,
              maxRosterSize: true,
            },
          },
          players: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
      });
      if (team) {
        const approvedCount = team.players.filter((player) => player.status === 'APPROVED').length;
        const before = {
          approvalStatus: team.approvalStatus,
          rosterStatus: team.rosterStatus,
          isConfirmed: team.isConfirmed,
          approvedCount,
          seasonId: team.season.id,
          seasonName: team.season.name,
        };

        if (action === 'SET_ROSTER_STATUS') {
          if (rosterStatus === 'SUBMITTED' && approvedCount < team.season.minRosterSize) {
            return NextResponse.json({
              error: `${team.name} is below the minimum roster size for submission`,
            }, { status: 409 });
          }

          if (rosterStatus === 'FINALIZED') {
            if (team.approvalStatus !== 'APPROVED') {
              return NextResponse.json({
                error: `${team.name} must be approved before finalizing its official roster`,
              }, { status: 409 });
            }

            if (approvedCount < team.season.minRosterSize || approvedCount > team.season.maxRosterSize) {
              return NextResponse.json({
                error: `${team.name} must have between ${team.season.minRosterSize} and ${team.season.maxRosterSize} approved players before finalizing`,
              }, { status: 409 });
            }
          }
        }

        const updated = await prisma.team.update({
          where: { id: teamId },
          data: action === 'APPROVE'
            ? {
                approvalStatus: 'APPROVED',
                isConfirmed: true,
                rejectionReason: null,
              }
            : action === 'REJECT'
              ? {
                  approvalStatus: 'REJECTED',
                  rejectionReason,
                }
              : {
                  rosterStatus,
                },
        });
        results.push(updated);

        await createAuditLog({
          actor,
          actionType: action === 'SET_ROSTER_STATUS' ? 'UPDATE' : action === 'APPROVE' ? 'APPROVE' : 'REJECT',
          entityType: 'TEAM',
          entityId: teamId,
          before,
          after: {
            approvalStatus: updated.approvalStatus,
            rosterStatus: updated.rosterStatus,
            isConfirmed: updated.isConfirmed,
            approvedCount,
            seasonId: team.season.id,
            seasonName: team.season.name,
          },
          notes:
            action === 'SET_ROSTER_STATUS'
              ? `Admin set official roster lifecycle to ${rosterStatus}`
              : action === 'APPROVE'
                ? 'Admin approved team'
                : rejectionReason,
        });
      }
    }

    if (action === 'APPROVE' || action === 'REJECT') {
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
    }

    return NextResponse.json({ success: true, updated: results.length, action, rosterStatus: rosterStatus ?? null });
  } catch (error) {
    console.error('Error updating teams:', error);
    return NextResponse.json({ error: 'Failed to update teams' }, { status: 500 });
  }
}
