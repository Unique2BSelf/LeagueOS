import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
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
        },
      },
    },
  });
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

async function getDivisionAverageElo(divisionId: string) {
  const players = await prisma.teamPlayer.findMany({
    where: {
      status: 'APPROVED',
      team: { divisionId },
      user: { isActive: true },
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

async function resolveEligibilityForActor(input: {
  actorId: string;
  matchId: string;
  teamId: string;
  overrideUserId?: string | null;
}) {
  const memberships = await getApprovedMemberships(input.overrideUserId || input.actorId);
  const homeDivisionLevel = getHomeDivisionLevel(memberships);

  if (homeDivisionLevel === null) {
    return {
      eligible: false,
      reason: 'Player must be on an approved roster to claim this sub request',
    };
  }

  const [actor, team, match] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.overrideUserId || input.actorId },
      select: {
        id: true,
        fullName: true,
        isActive: true,
        isInsured: true,
        isGoalie: true,
        eloRating: true,
      },
    }),
    prisma.team.findUnique({
      where: { id: input.teamId },
      include: { division: true },
    }),
    prisma.match.findUnique({
      where: { id: input.matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    }),
  ]);

  if (!actor || !actor.isActive) {
    return { eligible: false, reason: 'Player not found or inactive' };
  }

  if (!team) {
    return { eligible: false, reason: 'Team not found' };
  }

  if (!match) {
    return { eligible: false, reason: 'Match not found' };
  }

  const divisionAverageElo = await getDivisionAverageElo(team.divisionId);
  const eligibility = checkSubEligibility(
    {
      id: actor.id,
      eloRating: actor.eloRating,
      isGoalie: actor.isGoalie,
      isInsured: actor.isInsured,
      homeDivision: homeDivisionLevel,
    },
    {
      id: match.id,
      division: team.division.level,
    },
    {
      id: team.id,
      subQuotaRemaining: team.subQuotaRemaining,
    },
    divisionAverageElo
  );

  return {
    ...eligibility,
    player: {
      id: actor.id,
      fullName: actor.fullName,
      isInsured: actor.isInsured,
      isGoalie: actor.isGoalie,
      eloRating: actor.eloRating,
      homeDivision: homeDivisionLevel,
    },
    team: {
      id: team.id,
      name: team.name,
      divisionId: team.divisionId,
      divisionLevel: team.division.level,
      subQuotaRemaining: team.subQuotaRemaining,
    },
    match: {
      id: match.id,
      scheduledAt: match.scheduledAt.toISOString(),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
    },
    divisionAverageElo,
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subId = searchParams.get('subId');
  const matchId = searchParams.get('matchId');
  const teamId = searchParams.get('teamId');
  const playerId = searchParams.get('playerId');

  const overrideUserId = playerId && ['ADMIN', 'MODERATOR', 'REF'].includes(actor.role) ? playerId : null;

  if (subId) {
    const sub = await prisma.sub.findUnique({
      where: { id: subId },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        status: true,
      },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Sub request not found' }, { status: 404 });
    }

    const eligibility = await resolveEligibilityForActor({
      actorId: actor.id,
      matchId: sub.matchId,
      teamId: sub.teamId,
      overrideUserId,
    });

    return NextResponse.json({
      rules: {
        standard: '1-Down / Any-Up',
        goalieException: true,
        ringerFlagThresholdMultiplier: 1.5,
        insuranceRequired: true,
        seasonalQuotaRequired: true,
      },
      subRequest: {
        id: sub.id,
        status: sub.status,
      },
      eligibility,
    });
  }

  if (!matchId || !teamId) {
    return NextResponse.json({
      rules: {
        standard: '1-Down / Any-Up',
        goalieException: true,
        ringerFlagThresholdMultiplier: 1.5,
        insuranceRequired: true,
        seasonalQuotaRequired: true,
      },
    });
  }

  const eligibility = await resolveEligibilityForActor({
    actorId: actor.id,
    matchId,
    teamId,
    overrideUserId,
  });

  return NextResponse.json({
    rules: {
      standard: '1-Down / Any-Up',
      goalieException: true,
      ringerFlagThresholdMultiplier: 1.5,
      insuranceRequired: true,
      seasonalQuotaRequired: true,
    },
    eligibility,
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subId = typeof body.subId === 'string' ? body.subId : '';
  const matchId = typeof body.matchId === 'string' ? body.matchId : '';
  const teamId = typeof body.teamId === 'string' ? body.teamId : '';
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';

  const overrideUserId = playerId && ['ADMIN', 'MODERATOR', 'REF'].includes(actor.role) ? playerId : null;

  if (subId) {
    const sub = await prisma.sub.findUnique({
      where: { id: subId },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        status: true,
      },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Sub request not found' }, { status: 404 });
    }

    const eligibility = await resolveEligibilityForActor({
      actorId: actor.id,
      matchId: sub.matchId,
      teamId: sub.teamId,
      overrideUserId,
    });

    return NextResponse.json({
      subRequest: {
        id: sub.id,
        status: sub.status,
      },
      eligibility,
    });
  }

  if (!matchId || !teamId) {
    return NextResponse.json({ error: 'matchId and teamId are required' }, { status: 400 });
  }

  const eligibility = await resolveEligibilityForActor({
    actorId: actor.id,
    matchId,
    teamId,
    overrideUserId,
  });

  return NextResponse.json({ eligibility });
}
