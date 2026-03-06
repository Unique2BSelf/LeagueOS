import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all matches the ref has worked
    const matches = await prisma.match.findMany({
      where: { refId: userId, status: 'FINAL' },
      include: {
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    // Calculate payouts (example rates)
    const rates: Record<string, number> = {
      'Premier': 75,
      'Compete': 60,
      'Recreational': 45,
    };

    let totalEarnings = 0;
    const payoutHistory = matches.map(match => {
      const division = match.season?.name || 'Recreational';
      const rate = rates[division] || 45;
      totalEarnings += rate;
      return {
        matchId: match.id,
        date: match.scheduledAt,
        division,
        rate,
        status: 'PAID',
      };
    });

    // Get ledger entries for this ref
    const ledgers = await prisma.ledger.findMany({
      where: { 
        userId,
        type: 'REF_PAYOUT',
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      totalEarnings,
      totalMatches: matches.length,
      payoutHistory,
      ledgers,
      is1099Eligible: totalEarnings >= 2000,
      currentYearEarnings: totalEarnings,
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
