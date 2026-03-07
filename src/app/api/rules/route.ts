import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

async function resolveSeasonId(seasonId?: string | null) {
  if (seasonId) {
    return seasonId;
  }

  const season = await prisma.season.findFirst({
    where: { isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });

  return season?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = await resolveSeasonId(searchParams.get('seasonId'));

    const seasons = await prisma.season.findMany({
      where: { isArchived: false },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!seasonId) {
      return NextResponse.json({ seasons, selectedSeasonId: null, document: null });
    }

    const document = await prisma.seasonRulesDocument.findUnique({
      where: { seasonId },
      include: {
        season: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    });

    return NextResponse.json({
      seasons,
      selectedSeasonId: seasonId,
      document,
    });
  } catch (error) {
    console.error('Rules GET error:', error);
    return NextResponse.json({ error: 'Failed to load rules' }, { status: 500 });
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
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    const effectiveDate = typeof body?.effectiveDate === 'string' && body.effectiveDate ? new Date(body.effectiveDate) : null;

    if (!seasonId || !title || !content) {
      return NextResponse.json({ error: 'seasonId, title, and content are required' }, { status: 400 });
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true },
    });
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const existing = await prisma.seasonRulesDocument.findUnique({ where: { seasonId } });
    if (existing) {
      return NextResponse.json({ error: 'Rules already exist for this season' }, { status: 409 });
    }

    const created = await prisma.seasonRulesDocument.create({
      data: {
        seasonId,
        title,
        content,
        summary: summary || null,
        effectiveDate,
      },
      include: {
        season: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'SEASON',
      entityId: seasonId,
      after: {
        rulesTitle: created.title,
        effectiveDate: created.effectiveDate?.toISOString() ?? null,
      },
      notes: `Created rules document for ${season.name}`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Rules POST error:', error);
    return NextResponse.json({ error: 'Failed to create rules' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const seasonId = typeof body?.seasonId === 'string' ? body.seasonId : '';
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId is required' }, { status: 400 });
    }

    const existing = await prisma.seasonRulesDocument.findUnique({ where: { seasonId } });
    if (!existing) {
      return NextResponse.json({ error: 'Rules document not found' }, { status: 404 });
    }

    const updated = await prisma.seasonRulesDocument.update({
      where: { seasonId },
      data: {
        title: typeof body?.title === 'string' ? body.title.trim() : existing.title,
        summary: typeof body?.summary === 'string' ? body.summary.trim() || null : existing.summary,
        content: typeof body?.content === 'string' ? body.content.trim() : existing.content,
        effectiveDate: typeof body?.effectiveDate === 'string'
          ? (body.effectiveDate ? new Date(body.effectiveDate) : null)
          : existing.effectiveDate,
      },
      include: {
        season: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'SEASON',
      entityId: seasonId,
      before: {
        title: existing.title,
        effectiveDate: existing.effectiveDate?.toISOString() ?? null,
        summary: existing.summary,
      },
      after: {
        title: updated.title,
        effectiveDate: updated.effectiveDate?.toISOString() ?? null,
        summary: updated.summary,
      },
      notes: `Updated rules document for ${updated.season.name}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Rules PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 });
  }
}
