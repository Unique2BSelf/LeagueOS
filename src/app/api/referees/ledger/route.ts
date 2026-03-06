import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: { refId: userId },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const totalMatches = matches.length;
    const completedMatches = matches.filter((match) => match.status === 'FINAL').length;
    const totalMinutes = completedMatches * 60;
    const homeWins = matches.filter((match) => (match.homeScore ?? 0) > (match.awayScore ?? 0)).length;
    const awayWins = matches.filter((match) => (match.awayScore ?? 0) > (match.homeScore ?? 0)).length;
    const draws = matches.filter((match) => match.homeScore === match.awayScore).length;
    const attendanceRate = 95;

    const ledgers = await prisma.ledger.findMany({
      where: { userId, type: 'REF_PAYOUT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const rates: Record<string, number> = {
      Premier: 75,
      Compete: 60,
      Recreational: 45,
    };

    const earningsByDivision: Record<string, number> = {};
    matches.forEach((match) => {
      const division = match.season?.name || 'Recreational';
      earningsByDivision[division] = (earningsByDivision[division] || 0) + (rates[division] || 45);
    });

    const totalEarnings = Object.values(earningsByDivision).reduce((sum, value) => sum + value, 0);

    return NextResponse.json({
      summary: {
        totalMatches,
        completedMatches,
        totalMinutes,
        totalEarnings,
        attendanceRate,
        homeWins,
        awayWins,
        draws,
      },
      earningsByDivision,
      recentLedgers: ledgers,
      matches: matches.slice(0, 10).map((match) => ({
        id: match.id,
        date: match.scheduledAt,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: String(match.homeScore ?? 0) + ' - ' + String(match.awayScore ?? 0),
        status: match.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
