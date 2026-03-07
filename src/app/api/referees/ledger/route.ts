import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRefActor, getRefMatchRate } from '@/lib/referees';

export async function GET(request: NextRequest) {
  const actor = await getRefActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: { refId: actor.id },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
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
    const attendanceRate = totalMatches === 0 ? 0 : Math.round((completedMatches / totalMatches) * 100);

    const ledgers = await prisma.ledger.findMany({
      where: { userId: actor.id, type: 'REF_PAYOUT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const earningsByDivision: Record<string, number> = {};
    matches.forEach((match) => {
      const divisionLevel = match.homeTeam.division?.level ?? match.awayTeam.division?.level ?? 3;
      const divisionName = divisionLevel === 1 ? 'Premier' : divisionLevel === 2 ? 'Competitive' : 'Recreational';
      earningsByDivision[divisionName] = (earningsByDivision[divisionName] || 0) + getRefMatchRate(divisionLevel);
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
        score: `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`,
        status: match.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
