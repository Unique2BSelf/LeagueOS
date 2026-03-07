import { NextRequest, NextResponse } from 'next/server';
import { MatchStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getRefActor } from '@/lib/referees';

export async function GET(request: NextRequest) {
  const actor = await getRefActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refId = searchParams.get('refId');
  const statusParam = searchParams.get('status');
  const status = statusParam && Object.values(MatchStatus).includes(statusParam as MatchStatus)
    ? statusParam as MatchStatus
    : undefined;

  if (refId && refId !== actor.id && !['ADMIN', 'MODERATOR'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const reports = await prisma.match.findMany({
      where: {
        refId: refId || actor.id,
        ...(status ? { status } : {}),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching referee reports:', error);
    return NextResponse.json({ error: 'Failed to fetch referee reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await getRefActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const matchId = typeof body.matchId === 'string' ? body.matchId : '';
    const homeScore = Number(body.homeScore);
    const awayScore = Number(body.awayScore);

    if (!matchId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      return NextResponse.json({ error: 'matchId, homeScore, and awayScore are required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    if (match.refId !== actor.id && !['ADMIN', 'MODERATOR'].includes(actor.role)) {
      return NextResponse.json({ error: 'Not assigned' }, { status: 403 });
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { homeScore, awayScore, status: 'FINAL', checklistDone: true },
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error) {
    console.error('Error submitting referee report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
