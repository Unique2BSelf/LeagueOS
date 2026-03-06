import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { AvailabilityStatus } from '@prisma/client';

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
      role: true,
      isActive: true,
    },
  });
}

async function getApprovedTeamIds(userId: string) {
  const memberships = await prisma.teamPlayer.findMany({
    where: {
      userId,
      status: 'APPROVED',
    },
    select: {
      teamId: true,
    },
  });

  return memberships.map((membership) => membership.teamId);
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamIds = await getApprovedTeamIds(actor.id);
    if (teamIds.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const matches = await prisma.match.findMany({
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
    });

    const fieldIds = [...new Set(matches.map((match) => match.fieldId))];
    const fields = fieldIds.length
      ? await prisma.field.findMany({
          where: { id: { in: fieldIds } },
          include: { location: true },
        })
      : [];
    const fieldsById = new Map(fields.map((field) => [field.id, field]));

    const availability = await prisma.matchAvailability.findMany({
      where: {
        userId: actor.id,
        matchId: { in: matches.map((match) => match.id) },
      },
    });
    const availabilityByMatchId = new Map(availability.map((entry) => [entry.matchId, entry]));

    return NextResponse.json({
      matches: matches.map((match) => {
        const field = fieldsById.get(match.fieldId);
        const myAvailability = availabilityByMatchId.get(match.id);

        return {
          id: match.id,
          scheduledAt: match.scheduledAt.toISOString(),
          date: match.scheduledAt.toISOString().split('T')[0],
          time: match.scheduledAt.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
          }),
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          field: field?.name || 'Unknown Field',
          location: field?.location?.name || 'Unknown Location',
          seasonName: match.season.name,
          myStatus: myAvailability?.status || null,
        };
      }),
    });
  } catch (error) {
    console.error('Availability GET failed:', error);
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 });
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
    const status = typeof body.status === 'string' ? body.status.toUpperCase() : '';

    if (!matchId || !['YES', 'NO', 'MAYBE'].includes(status)) {
      return NextResponse.json({ error: 'matchId and valid status are required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const teamIds = await getApprovedTeamIds(actor.id);
    const isRosteredForMatch = teamIds.includes(match.homeTeamId) || teamIds.includes(match.awayTeamId);
    if (!isRosteredForMatch) {
      return NextResponse.json({ error: 'You are not rostered for this match' }, { status: 403 });
    }

    const saved = await prisma.matchAvailability.upsert({
      where: {
        userId_matchId: {
          userId: actor.id,
          matchId,
        },
      },
      update: {
        status: status as AvailabilityStatus,
      },
      create: {
        userId: actor.id,
        matchId,
        status: status as AvailabilityStatus,
      },
    });

    return NextResponse.json({
      success: true,
      availability: {
        matchId: saved.matchId,
        userId: saved.userId,
        status: saved.status,
      },
    });
  } catch (error) {
    console.error('Availability POST failed:', error);
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 });
  }
}

