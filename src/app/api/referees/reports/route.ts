import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const refId = searchParams.get('refId') || userId;

  try {
    const reports = await prisma.match.findMany({
      where: { refId },
      include: { homeTeam: true, awayTeam: true, season: true },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { matchId, homeScore, awayScore } = body;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.refId !== userId) return NextResponse.json({ error: 'Not assigned' }, { status: 403 });

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { homeScore, awayScore, status: 'FINAL', checklistDone: true },
    });

    return NextResponse.json({ success: true, match: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
