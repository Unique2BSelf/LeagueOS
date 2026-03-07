import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      isActive: true,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const body = await request.json().catch(() => null);
    const rosterStatus = typeof body?.rosterStatus === 'string' ? body.rosterStatus : '';

    if (!['DRAFT', 'SUBMITTED', 'FINALIZED'].includes(rosterStatus)) {
      return NextResponse.json({ error: 'Valid rosterStatus is required' }, { status: 400 });
    }

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

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const canManage = actor.role === 'ADMIN' || team.captainId === actor.id;
    if (!canManage) {
      return NextResponse.json({ error: 'Only the team captain or an admin can manage official roster status' }, { status: 403 });
    }

    const approvedCount = team.players.filter((player) => player.status === 'APPROVED').length;
    if (rosterStatus === 'SUBMITTED' && approvedCount < team.season.minRosterSize) {
      return NextResponse.json({
        error: `Roster needs at least ${team.season.minRosterSize} approved players before submission`,
      }, { status: 409 });
    }

    if (rosterStatus === 'FINALIZED') {
      if (team.approvalStatus !== 'APPROVED') {
        return NextResponse.json({ error: 'Team must be approved before the official roster can be finalized' }, { status: 409 });
      }

      if (approvedCount < team.season.minRosterSize || approvedCount > team.season.maxRosterSize) {
        return NextResponse.json({
          error: `Roster must stay between ${team.season.minRosterSize} and ${team.season.maxRosterSize} approved players before finalizing`,
        }, { status: 409 });
      }
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { rosterStatus },
      select: {
        id: true,
        name: true,
        rosterStatus: true,
        approvalStatus: true,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'TEAM',
      entityId: teamId,
      before: {
        rosterStatus: team.rosterStatus,
        approvalStatus: team.approvalStatus,
        approvedCount,
        seasonId: team.season.id,
        seasonName: team.season.name,
      },
      after: {
        rosterStatus: updated.rosterStatus,
        approvalStatus: updated.approvalStatus,
        approvedCount,
        seasonId: team.season.id,
        seasonName: team.season.name,
      },
      notes: `Official roster lifecycle moved to ${rosterStatus}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating official roster status:', error);
    return NextResponse.json({ error: 'Failed to update official roster status' }, { status: 500 });
  }
}
