import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/seasons - List all seasons
export async function GET(request: NextRequest) {
  try {
    const seasons = await prisma.season.findMany({
      include: {
        divisions: true,
        teams: true,
      },
      orderBy: { startDate: 'desc' },
    });

    const seasonsWithCounts = seasons.map(season => ({
      ...season,
      divisions: season.divisions.length,
      teams: season.teams.length,
    }));

    return NextResponse.json(seasonsWithCounts);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 });
  }
}

// POST /api/seasons - Create new season
export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { name, startDate, endDate, scoringSystem, minRosterSize, maxRosterSize, subQuota } = await request.json();

    const season = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        scoringSystem: scoringSystem || 'TRADITIONAL',
        minRosterSize: minRosterSize || 8,
        maxRosterSize: maxRosterSize || 16,
        subQuota: subQuota || 10,
        isArchived: false,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'SEASON',
      entityId: season.id,
      after: {
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate?.toISOString() || null,
        isArchived: season.isArchived,
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error creating season:', error);
    return NextResponse.json({ error: 'Failed to create season' }, { status: 500 });
  }
}

// PATCH /api/seasons - Update season
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id, ...data } = await request.json();
    const existingSeason = await prisma.season.findUnique({ where: { id } });
    if (!existingSeason) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Convert date strings to Date objects
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const season = await prisma.season.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'SEASON',
      entityId: season.id,
      before: {
        name: existingSeason.name,
        startDate: existingSeason.startDate.toISOString(),
        endDate: existingSeason.endDate?.toISOString() || null,
        isArchived: existingSeason.isArchived,
      },
      after: {
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate?.toISOString() || null,
        isArchived: season.isArchived,
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json({ error: 'Failed to update season' }, { status: 500 });
  }
}

// DELETE /api/seasons - Delete season
export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    const existingSeason = await prisma.season.findUnique({ where: { id } });
    if (!existingSeason) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    await prisma.season.delete({
      where: { id },
    });

    await createAuditLog({
      actor,
      actionType: 'DELETE',
      entityType: 'SEASON',
      entityId: id,
      before: {
        name: existingSeason.name,
        startDate: existingSeason.startDate.toISOString(),
        endDate: existingSeason.endDate?.toISOString() || null,
        isArchived: existingSeason.isArchived,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
  }
}
