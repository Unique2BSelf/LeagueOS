import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get upcoming games that don't have a referee assigned
    const games = await prisma.match.findMany({
      where: {
        refId: null,
        scheduledAt: { gte: new Date() },
        status: 'SCHEDULED',
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        field: { include: { location: true } },
        season: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });

    const rates: Record<string, number> = {
      'Premier': 75,
      'Compete': 60,
      'Recreational': 45,
    };

    const jobs = games.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      scheduledAt: game.scheduledAt.toISOString(),
      field: game.field?.name || "TBD",
      division: game.season?.name || 'Recreational',
      pay: rates[game.season?.name || 'Recreational'] || 45,
    }));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching referee jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId } = await request.json();

    // Verify user is a referee
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'REF' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Must be a referee to claim games' }, { status: 403 });
    }

    // Assign referee to match
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { refId: userId, status: 'SCHEDULED' },
    });

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error('Error claiming job:', error);
    return NextResponse.json({ error: 'Failed to claim job' }, { status: 500 });
  }
}
