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

async function canManageTeam(teamId: string, actorId: string, actorRole: string) {
  if (actorRole === 'ADMIN') {
    return true;
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captainId: true },
  });

  return team?.captainId === actorId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const players = await prisma.teamPlayer.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching team players:', error);
    return NextResponse.json({ error: 'Failed to fetch team players' }, { status: 500 });
  }
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
    const allowed = await canManageTeam(teamId, actor.id, actor.role);
    if (!allowed) {
      return NextResponse.json({ error: 'Only the captain or an admin can manage this roster' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const action = typeof body?.action === 'string' ? body.action : '';

    if (!userId || !['APPROVE', 'REMOVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'userId and valid action are required' }, { status: 400 });
    }

    const membership = await prisma.teamPlayer.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Roster entry not found' }, { status: 404 });
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
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.rosterStatus === 'FINALIZED' && actor.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'This official roster is finalized. Reopen it before changing players.',
      }, { status: 409 });
    }

    if (team.captainId === userId && action !== 'APPROVE') {
      return NextResponse.json({ error: 'The team captain cannot be removed from the roster here' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const approvedCount = await prisma.teamPlayer.count({
        where: {
          teamId,
          status: 'APPROVED',
        },
      });

      if (approvedCount >= team.season.maxRosterSize) {
        return NextResponse.json({ error: 'Roster is already full for this season' }, { status: 409 });
      }

      const updated = await prisma.teamPlayer.update({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
        data: {
          status: 'APPROVED',
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (team.rosterStatus === 'FINALIZED' && actor.role === 'ADMIN') {
        await prisma.team.update({
          where: { id: teamId },
          data: { rosterStatus: 'DRAFT' },
        });
      }

      await createAuditLog({
        actor,
        actionType: 'APPROVE',
        entityType: 'TEAM',
        entityId: teamId,
        after: {
          userId,
          status: 'APPROVED',
          teamId,
          seasonId: team.season.id,
          seasonName: team.season.name,
          previousRosterStatus: team.rosterStatus,
          nextRosterStatus: team.rosterStatus === 'FINALIZED' && actor.role === 'ADMIN' ? 'DRAFT' : team.rosterStatus,
        },
        notes: team.rosterStatus === 'FINALIZED' && actor.role === 'ADMIN'
          ? 'Admin approved player and automatically reopened finalized roster to draft'
          : undefined,
      });

      return NextResponse.json(updated);
    }

    if (action === 'REJECT' || action === 'REMOVE') {
      await prisma.teamPlayer.delete({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      if (team.rosterStatus === 'FINALIZED' && actor.role === 'ADMIN') {
        await prisma.team.update({
          where: { id: teamId },
          data: { rosterStatus: 'DRAFT' },
        });
      }

      await createAuditLog({
        actor,
        actionType: action === 'REJECT' ? 'REJECT' : 'DELETE',
        entityType: 'TEAM',
        entityId: teamId,
        before: {
          userId,
          status: membership.status,
          teamId,
          seasonId: team.season.id,
          seasonName: team.season.name,
          previousRosterStatus: team.rosterStatus,
        },
        notes:
          team.rosterStatus === 'FINALIZED' && actor.role === 'ADMIN'
            ? 'Admin changed a finalized roster and automatically reopened it to draft'
            : action === 'REJECT'
              ? 'Captain/admin rejected join request'
              : 'Captain/admin removed rostered player',
      });

      return NextResponse.json({ success: true, removedUserId: userId, action });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating team roster:', error);
    return NextResponse.json({ error: 'Failed to update roster' }, { status: 500 });
  }
}
