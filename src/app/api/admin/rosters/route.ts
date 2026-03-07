import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
    const action = typeof body?.action === 'string' ? body.action : '';
    const note = typeof body?.note === 'string' ? body.note.trim() : '';

    if (!userId || !['ASSIGN', 'MOVE', 'REMOVE'].includes(action)) {
      return NextResponse.json({ error: 'userId and valid action are required' }, { status: 400 });
    }

    if ((action === 'ASSIGN' || action === 'MOVE') && !teamId) {
      return NextResponse.json({ error: 'teamId is required for assignment' }, { status: 400 });
    }

    if (action === 'REMOVE' && !teamId) {
      return NextResponse.json({ error: 'teamId is required for removal' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Cannot roster an inactive user' }, { status: 409 });
    }

    if (action === 'REMOVE') {
      const membership = await prisma.teamPlayer.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
        include: {
          team: {
            include: {
              season: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!membership) {
        return NextResponse.json({ error: 'Roster entry not found' }, { status: 404 });
      }

      if (membership.team.captainId === userId) {
        return NextResponse.json({ error: 'Use team management to transfer captaincy before removing the captain' }, { status: 409 });
      }

      await prisma.teamPlayer.delete({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      await createAuditLog({
        actor,
        actionType: 'DELETE',
        entityType: 'TEAM',
        entityId: teamId,
        before: {
          userId,
          fullName: user.fullName,
          email: user.email,
          status: membership.status,
          seasonId: membership.team.season.id,
          seasonName: membership.team.season.name,
        },
        notes: note || 'Admin removed player from team roster',
      });

      return NextResponse.json({ success: true, action: 'REMOVE' });
    }

    const targetTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            maxRosterSize: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });

    if (!targetTeam) {
      return NextResponse.json({ error: 'Target team not found' }, { status: 404 });
    }

    const approvedCount = await prisma.teamPlayer.count({
      where: {
        teamId,
        status: 'APPROVED',
      },
    });

    const existingMembership = await prisma.teamPlayer.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    const existingSeasonMemberships = await prisma.teamPlayer.findMany({
      where: {
        userId,
        team: {
          seasonId: targetTeam.seasonId,
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const currentApprovedMembership = existingSeasonMemberships.find(
      (membership) => membership.status === 'APPROVED' && membership.teamId !== teamId,
    );

    if (approvedCount >= targetTeam.season.maxRosterSize && (!existingMembership || existingMembership.status !== 'APPROVED')) {
      return NextResponse.json({ error: 'Target team roster is full for this season' }, { status: 409 });
    }

    if (action === 'ASSIGN' && currentApprovedMembership) {
      return NextResponse.json({
        error: `Player is already rostered on ${currentApprovedMembership.team.name} for this season. Use MOVE instead.`,
      }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      if (action === 'MOVE') {
        const membershipsToRemove = existingSeasonMemberships.filter((membership) => membership.teamId !== teamId);

        for (const membership of membershipsToRemove) {
          await tx.teamPlayer.delete({
            where: {
              userId_teamId: {
                userId,
                teamId: membership.teamId,
              },
            },
          });
        }
      }

      if (existingMembership) {
        await tx.teamPlayer.update({
          where: {
            userId_teamId: {
              userId,
              teamId,
            },
          },
          data: {
            status: 'APPROVED',
          },
        });
      } else {
        await tx.teamPlayer.create({
          data: {
            userId,
            teamId,
            status: 'APPROVED',
          },
        });
      }
    });

    await createAuditLog({
      actor,
      actionType: action === 'MOVE' ? 'UPDATE' : 'APPROVE',
      entityType: 'TEAM',
      entityId: teamId,
      before: existingSeasonMemberships.map((membership) => ({
        teamId: membership.teamId,
        teamName: membership.team.name,
        status: membership.status,
      })),
      after: {
        teamId,
        teamName: targetTeam.name,
        divisionId: targetTeam.division.id,
        divisionName: targetTeam.division.name,
        seasonId: targetTeam.season.id,
        seasonName: targetTeam.season.name,
        status: 'APPROVED',
      },
      notes:
        note ||
        (action === 'MOVE'
          ? 'Admin moved player between teams without invite code'
          : 'Admin rostered player directly without invite code'),
    });

    return NextResponse.json({
      success: true,
      action,
      team: {
        id: targetTeam.id,
        name: targetTeam.name,
        seasonId: targetTeam.season.id,
        seasonName: targetTeam.season.name,
        divisionName: targetTeam.division.name,
      },
    });
  } catch (error) {
    console.error('Error updating admin roster assignment:', error);
    return NextResponse.json({ error: 'Failed to update roster assignment' }, { status: 500 });
  }
}
