import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
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
      select: { captainId: true },
    });

    if (team?.captainId === userId && action !== 'APPROVE') {
      return NextResponse.json({ error: 'The team captain cannot be removed from the roster here' }, { status: 400 });
    }

    if (action === 'APPROVE') {
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

      return NextResponse.json({ success: true, removedUserId: userId, action });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating team roster:', error);
    return NextResponse.json({ error: 'Failed to update roster' }, { status: 500 });
  }
}
