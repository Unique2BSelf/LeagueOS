import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

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
    divisionLevel: team.division?.level ?? null,
    seasonId: team.seasonId,
    seasonName: team.season?.name || 'Current Season',
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    escrowTarget: team.escrowTarget,
    currentBalance: team.currentBalance,
    isConfirmed: team.isConfirmed,
    approvalStatus: team.approvalStatus,
    playersCount: team.players.filter((player) => player.status === 'APPROVED').length,
    openSlots: Math.max(
      0,
      (team.season?.maxRosterSize ?? 16) - team.players.filter((player) => player.status === 'APPROVED').length,
    ),
    minRosterSize: team.season?.minRosterSize ?? 8,
    maxRosterSize: team.season?.maxRosterSize ?? 16,
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
      select: { id: true, role: true, fullName: true, email: true },
    });

    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Captain or admin required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, divisionId, primaryColor, secondaryColor, escrowTarget } = body;

    if (!name || !divisionId) {
      return NextResponse.json({ error: 'Name and division are required' }, { status: 400 });
    }

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      include: {
        season: {
          select: {
            id: true,
            isArchived: true,
          },
        },
      },
    });

    if (!division) {
      return NextResponse.json({ error: 'Selected division was not found' }, { status: 404 });
    }

    if (division.season.isArchived) {
      return NextResponse.json({ error: 'Cannot create teams in an archived season' }, { status: 409 });
    }

    const seasonId = division.season.id;

    const existingTeam = await prisma.team.findFirst({
      where: {
        seasonId,
        name: {
          equals: String(name).trim(),
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existingTeam) {
      return NextResponse.json({ error: 'A team with this name already exists in the selected season' }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: {
        name: String(name).trim(),
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

    await createAuditLog({
      actor: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      actionType: 'CREATE',
      entityType: 'TEAM',
      entityId: team.id,
      after: {
        name: team.name,
        captainId: team.captainId,
        divisionId: team.divisionId,
        seasonId: team.seasonId,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
