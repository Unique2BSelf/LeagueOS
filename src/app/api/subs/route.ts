import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { SubRequestStatus } from '@prisma/client';
import { calculateDivisionAverageElo, checkSubEligibility } from '@/lib/subEligibility';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      isInsured: true,
      isGoalie: true,
      eloRating: true,
    },
  });
}

async function getApprovedMemberships(userId: string) {
  return prisma.teamPlayer.findMany({
    where: { userId, status: 'APPROVED' },
    include: {
      team: {
        include: {
          division: true,
          season: true,
        },
      },
    },
  });
}

async function getDivisionAverageElo(divisionId: string) {
  const players = await prisma.teamPlayer.findMany({
    where: {
      status: 'APPROVED',
      team: {
        divisionId,
      },
      user: {
        isActive: true,
      },
    },
    select: {
      user: {
        select: {
          eloRating: true,
        },
      },
    },
  });

  return calculateDivisionAverageElo(players.map((entry) => ({ eloRating: entry.user.eloRating })));
}

function getHomeDivisionLevel(memberships: Awaited<ReturnType<typeof getApprovedMemberships>>) {
  if (memberships.length === 0) {
    return null;
  }

  return memberships.reduce((lowest, membership) => {
    if (lowest === null) {
      return membership.team.division.level;
    }

    return Math.min(lowest, membership.team.division.level);
  }, null as number | null);
}

async function getOpenRequestsForViewer(userId: string) {
  const requests = await prisma.sub.findMany({
    where: {
      status: 'OPEN',
      requestedById: { not: userId },
      match: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
      },
    },
    include: {
      requester: {
        select: { id: true, fullName: true, isGoalie: true, eloRating: true, isInsured: true },
      },
      match: {
        include: {
          homeTeam: { include: { division: true } },
          awayTeam: { include: { division: true } },
          season: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await getApprovedMemberships(actor.id);
    const teamIds = memberships.map((membership) => membership.teamId);
    const homeDivisionLevel = getHomeDivisionLevel(memberships);

    const eligibleMatches = teamIds.length
      ? await prisma.match.findMany({
          where: {
            status: 'SCHEDULED',
            scheduledAt: { gte: new Date() },
            OR: [
              { homeTeamId: { in: teamIds } },
              { awayTeamId: { in: teamIds } },
            ],
          },
          include: {
            homeTeam: true,
            awayTeam: true,
            season: true,
          },
          orderBy: { scheduledAt: 'asc' },
          take: 20,
        })
      : [];

    const myRequests = await prisma.sub.findMany({
      where: { requestedById: actor.id },
      include: {
        claimant: { select: { id: true, fullName: true } },
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            season: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const openRequests = await getOpenRequestsForViewer(actor.id);
    const requestedTeamIds = [...new Set(openRequests.map((sub) => sub.teamId))];
    const requestedTeams = requestedTeamIds.length
      ? await prisma.team.findMany({
          where: { id: { in: requestedTeamIds } },
          include: { division: true },
        })
      : [];
    const requestedTeamMap = new Map(requestedTeams.map((team) => [team.id, team]));

    const availableRequests = await Promise.all(
      openRequests.map(async (sub) => {
        const requestedTeam = requestedTeamMap.get(sub.teamId);
        if (!requestedTeam || homeDivisionLevel === null) {
          return null;
        }

        const divisionAverageElo = await getDivisionAverageElo(requestedTeam.divisionId);
        const divisionLevel = requestedTeam.division.level;
        const eligibility = checkSubEligibility(
          {
            id: actor.id,
            eloRating: actor.eloRating,
            isGoalie: actor.isGoalie,
            isInsured: actor.isInsured,
            homeDivision: homeDivisionLevel,
          },
          {
            id: sub.matchId,
            division: divisionLevel,
          },
          {
            id: requestedTeam.id,
            subQuotaRemaining: requestedTeam.subQuotaRemaining,
          },
          divisionAverageElo
        );

        return {
          id: sub.id,
          matchId: sub.matchId,
          teamId: sub.teamId,
          requestedById: sub.requestedById,
          requestedByName: sub.requester.fullName,
          status: sub.status,
          createdAt: sub.createdAt.toISOString(),
          match: {
            scheduledAt: sub.match.scheduledAt.toISOString(),
            homeTeam: sub.match.homeTeam.name,
            awayTeam: sub.match.awayTeam.name,
            seasonName: sub.match.season.name,
          },
          teamName: requestedTeam.name,
          eligibility,
        };
      })
    );

    return NextResponse.json({
      eligibleMatches: eligibleMatches.map((match) => {
        const teamId = teamIds.includes(match.homeTeamId) ? match.homeTeamId : match.awayTeamId;
        return {
          id: match.id,
          teamId,
          scheduledAt: match.scheduledAt.toISOString(),
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          seasonName: match.season.name,
          hasOpenRequest: myRequests.some((request) => request.matchId === match.id && request.status === 'OPEN'),
        };
      }),
      myRequests: myRequests.map((sub) => ({
        id: sub.id,
        matchId: sub.matchId,
        teamId: sub.teamId,
        status: sub.status,
        approved: sub.approved,
        createdAt: sub.createdAt.toISOString(),
        claimedBy: sub.claimant?.fullName || null,
        match: {
          scheduledAt: sub.match.scheduledAt.toISOString(),
          homeTeam: sub.match.homeTeam.name,
          awayTeam: sub.match.awayTeam.name,
          seasonName: sub.match.season.name,
        },
      })),
      availableRequests: availableRequests.filter(Boolean),
    });
  } catch (error) {
    console.error('Sub request GET failed:', error);
    return NextResponse.json({ error: 'Failed to load sub requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const matchId = typeof body.matchId === 'string' ? body.matchId : '';

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const memberships = await getApprovedMemberships(actor.id);
    const teamIds = memberships.map((membership) => membership.teamId);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const teamId = teamIds.includes(match.homeTeamId)
      ? match.homeTeamId
      : teamIds.includes(match.awayTeamId)
        ? match.awayTeamId
        : null;

    if (!teamId) {
      return NextResponse.json({ error: 'You are not rostered for this match' }, { status: 403 });
    }

    const existingRequest = await prisma.sub.findFirst({
      where: {
        matchId,
        requestedById: actor.id,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'A sub request already exists for this match' }, { status: 409 });
    }

    const sub = await prisma.sub.create({
      data: {
        matchId,
        requestedById: actor.id,
        teamId,
        status: SubRequestStatus.OPEN,
        approved: false,
      },
    });

    return NextResponse.json({
      id: sub.id,
      matchId: sub.matchId,
      status: sub.status,
      teamId: sub.teamId,
    }, { status: 201 });
  } catch (error) {
    console.error('Sub request POST failed:', error);
    return NextResponse.json({ error: 'Failed to create sub request' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = typeof body.action === 'string' ? body.action : '';

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const sub = await prisma.sub.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            homeTeam: { include: { division: true } },
            awayTeam: { include: { division: true } },
          },
        },
      },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Sub request not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      if (sub.requestedById !== actor.id && actor.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only the requester or an admin can cancel' }, { status: 403 });
      }

      const updated = await prisma.sub.update({
        where: { id },
        data: {
          status: SubRequestStatus.CANCELLED,
          approved: false,
          claimedById: null,
        },
      });

      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    if (action === 'claim') {
      if (sub.requestedById === actor.id) {
        return NextResponse.json({ error: 'You cannot claim your own sub request' }, { status: 400 });
      }

      if (sub.status !== 'OPEN') {
        return NextResponse.json({ error: 'Sub request is no longer available' }, { status: 409 });
      }

      const memberships = await getApprovedMemberships(actor.id);
      const homeDivisionLevel = getHomeDivisionLevel(memberships);
      if (homeDivisionLevel === null) {
        return NextResponse.json({ error: 'You must be on an approved roster to claim this sub' }, { status: 403 });
      }

      const requestedTeam = await prisma.team.findUnique({
        where: { id: sub.teamId },
        include: { division: true },
      });
      if (!requestedTeam) {
        return NextResponse.json({ error: 'Requesting team not found' }, { status: 404 });
      }

      const divisionAverageElo = await getDivisionAverageElo(requestedTeam.divisionId);
      const eligibility = checkSubEligibility(
        {
          id: actor.id,
          eloRating: actor.eloRating,
          isGoalie: actor.isGoalie,
          isInsured: actor.isInsured,
          homeDivision: homeDivisionLevel,
        },
        {
          id: sub.matchId,
          division: requestedTeam.division.level,
        },
        {
          id: requestedTeam.id,
          subQuotaRemaining: requestedTeam.subQuotaRemaining,
        },
        divisionAverageElo
      );

      if (!eligibility.eligible) {
        return NextResponse.json({ error: eligibility.reason || 'You are not eligible to claim this sub request' }, { status: 403 });
      }

      const updated = await prisma.sub.update({
        where: { id },
        data: {
          claimedById: actor.id,
          status: SubRequestStatus.CLAIMED,
          approved: true,
        },
      });

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        claimedById: updated.claimedById,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Sub request PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update sub request' }, { status: 500 });
  }
}

