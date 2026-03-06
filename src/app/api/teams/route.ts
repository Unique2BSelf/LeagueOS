import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

async function ensureDefaultSeasonAndDivision() {
  let season = await prisma.season.findFirst({
    orderBy: { startDate: 'desc' },
    include: { divisions: true },
  });

  if (!season) {
    season = await prisma.season.create({
      data: {
        name: `Open Season ${new Date().getFullYear()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        minRosterSize: 8,
        maxRosterSize: 16,
        subQuota: 10,
        divisions: {
          create: {
            name: 'Open',
            level: 1,
          },
        },
      },
      include: { divisions: true },
    });
  }

  if (!season.divisions.length) {
    const division = await prisma.division.create({
      data: {
        name: 'Open',
        level: 1,
        seasonId: season.id,
      },
    });
    season.divisions = [division];
  }

  return {
    season,
    division: season.divisions[0],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const teams = await prisma.team.findMany({
    include: {
      division: true,
      players: true,
      season: true,
    },
    orderBy: { name: 'asc' },
  });

  const mapped = teams.map((team) => ({
    id: team.id,
    name: team.name,
    captainId: team.captainId,
    divisionId: team.divisionId,
    division: team.division?.name || 'Open',
    seasonId: team.seasonId,
    seasonName: team.season?.name || 'Current Season',
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    escrowTarget: team.escrowTarget,
    currentBalance: team.currentBalance,
    isConfirmed: team.isConfirmed,
    playersCount: team.players.filter((player) => player.status === 'APPROVED').length,
    openSlots: Math.max(0, 16 - team.players.filter((player) => player.status === 'APPROVED').length),
  }));

  if (action === 'available') {
    return NextResponse.json(mapped.filter((team) => team.openSlots > 0));
  }

  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, fullName: true },
    });

    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Captain or admin required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, divisionId, primaryColor, secondaryColor, escrowTarget } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const fallback = await ensureDefaultSeasonAndDivision();
    const selectedDivision = divisionId
      ? await prisma.division.findUnique({ where: { id: divisionId } })
      : null;

    const division = selectedDivision || fallback.division;
    const seasonId = division.seasonId || fallback.season.id;

    const team = await prisma.team.create({
      data: {
        name,
        captainId: user.id,
        divisionId: division.id,
        seasonId,
        primaryColor: primaryColor || '#FF0000',
        secondaryColor: secondaryColor || '#FFFFFF',
        escrowTarget: Number(escrowTarget) || 2000,
      },
    });

    await prisma.teamPlayer.upsert({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: team.id,
        },
      },
      update: {
        status: 'APPROVED',
      },
      create: {
        userId: user.id,
        teamId: team.id,
        status: 'APPROVED',
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
