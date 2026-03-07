import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    const divisions = await prisma.division.findMany({
      where: seasonId ? { seasonId } : undefined,
      include: {
        season: {
          select: {
            id: true,
            name: true,
            minRosterSize: true,
            maxRosterSize: true,
          },
        },
        teams: {
          include: {
            players: {
              where: { status: 'APPROVED' },
              select: { userId: true },
            },
          },
        },
      },
      orderBy: [{ season: { startDate: 'desc' } }, { level: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(
      divisions.map((division) => ({
        id: division.id,
        name: division.name,
        level: division.level,
        seasonId: division.seasonId,
        seasonName: division.season.name,
        teamCount: division.teams.length,
        playerCount: division.teams.reduce((total, team) => total + team.players.length, 0),
        minRosterSize: division.season.minRosterSize,
        maxRosterSize: division.season.maxRosterSize,
      })),
    );
  } catch (error) {
    console.error('Error fetching divisions:', error);
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const seasonId = typeof body?.seasonId === 'string' ? body.seasonId : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const level = Number(body?.level);

    if (!seasonId || !name || !Number.isInteger(level) || level < 1) {
      return NextResponse.json({ error: 'seasonId, name, and positive integer level are required' }, { status: 400 });
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const duplicate = await prisma.division.findFirst({
      where: {
        seasonId,
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { level },
        ],
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Division name or level already exists for this season' }, { status: 409 });
    }

    const division = await prisma.division.create({
      data: {
        seasonId,
        name,
        level,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'DIVISION',
      entityId: division.id,
      after: {
        seasonId: division.seasonId,
        seasonName: season.name,
        name: division.name,
        level: division.level,
      },
    });

    return NextResponse.json(division, { status: 201 });
  } catch (error) {
    console.error('Error creating division:', error);
    return NextResponse.json({ error: 'Failed to create division' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const level = body?.level !== undefined ? Number(body.level) : undefined;

    if (!id || (!name && level === undefined)) {
      return NextResponse.json({ error: 'id and at least one field to update are required' }, { status: 400 });
    }

    const existingDivision = await prisma.division.findUnique({
      where: { id },
      include: {
        season: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingDivision) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    if (level !== undefined && (!Number.isInteger(level) || level < 1)) {
      return NextResponse.json({ error: 'level must be a positive integer' }, { status: 400 });
    }

    const duplicate = await prisma.division.findFirst({
      where: {
        seasonId: existingDivision.seasonId,
        id: { not: id },
        OR: [
          name ? { name: { equals: name, mode: 'insensitive' } } : undefined,
          level !== undefined ? { level } : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Division name or level already exists for this season' }, { status: 409 });
    }

    const updatedDivision = await prisma.division.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(level !== undefined ? { level } : {}),
      },
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'DIVISION',
      entityId: updatedDivision.id,
      before: {
        seasonId: existingDivision.seasonId,
        seasonName: existingDivision.season.name,
        name: existingDivision.name,
        level: existingDivision.level,
      },
      after: {
        seasonId: updatedDivision.seasonId,
        seasonName: existingDivision.season.name,
        name: updatedDivision.name,
        level: updatedDivision.level,
      },
    });

    return NextResponse.json(updatedDivision);
  } catch (error) {
    console.error('Error updating division:', error);
    return NextResponse.json({ error: 'Failed to update division' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Division id is required' }, { status: 400 });
    }

    const existingDivision = await prisma.division.findUnique({
      where: { id },
      include: {
        season: { select: { name: true } },
        teams: {
          select: { id: true },
        },
      },
    });

    if (!existingDivision) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    if (existingDivision.teams.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a division with teams assigned' }, { status: 409 });
    }

    await prisma.division.delete({ where: { id } });

    await createAuditLog({
      actor,
      actionType: 'DELETE',
      entityType: 'DIVISION',
      entityId: id,
      before: {
        seasonId: existingDivision.seasonId,
        seasonName: existingDivision.season.name,
        name: existingDivision.name,
        level: existingDivision.level,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting division:', error);
    return NextResponse.json({ error: 'Failed to delete division' }, { status: 500 });
  }
}
