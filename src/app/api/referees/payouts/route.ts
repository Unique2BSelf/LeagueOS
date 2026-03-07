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
      where: { refId: actor.id, status: 'FINAL' },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    let totalEarnings = 0;
    const payoutHistory = matches.map((match) => {
      const divisionLevel = match.homeTeam.division?.level ?? match.awayTeam.division?.level ?? 3;
      const rate = getRefMatchRate(divisionLevel);
      totalEarnings += rate;

      return {
        matchId: match.id,
        date: match.scheduledAt,
        division: divisionLevel === 1 ? 'Premier' : divisionLevel === 2 ? 'Competitive' : 'Recreational',
        rate,
        status: 'PAID',
      };
    });

    const ledgers = await prisma.ledger.findMany({
      where: {
        userId: actor.id,
        type: 'REF_PAYOUT',
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      totalEarnings,
      totalMatches: matches.length,
      payoutHistory,
      ledgers,
      is1099Eligible: totalEarnings >= 600,
      currentYearEarnings: totalEarnings,
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
