import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Detailed stats ledger for referees
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all matches the ref has worked
    const matches = await prisma.match.findMany({
      where: { refId: userId },
      include: {
        homeTeam: true,
        awayTeam: true,
        field: { include: { location: true } },
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    // Calculate detailed stats
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'FINAL').length;
    const totalMinutes = matches.reduce((sum, m) => sum + (m.gameLengthMinutes || 60), 0);
    
    // Calculate cards issued
    // Note: Would need to track cards in a separate table or Match model
    
    // Calculate win/loss for home teams (for ratings)
    const homeWins = matches.filter(m => m.homeScore! > m.awayScore!).length;
    const awayWins = matches.filter(m => m.awayScore! < m.homeScore!).length;
    const draws = matches.filter(m => m.homeScore === m.awayScore).length;

    // Attendance rate (would need check-in tracking)
    const attendanceRate = 95; // Placeholder

    // Get ledger entries
    const ledgers = await prisma.ledger.findMany({
      where: { userId, type: 'REF_PAYOUT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Calculate earnings by division
    const rates: Record<string, number> = {
      'Premier': 75,
      'Compete': 60,
      'Recreational': 45,
    };

    const earningsByDivision: Record<string, number> = {};
    matches.forEach(m => {
      const div = m.season?.name || 'Recreational';
      earningsByDivision[div] = (earningsByDivision[div] || 0) + (rates[div] || 45);
    });

    const totalEarnings = Object.values(earningsByDivision).reduce((a, b) => a + b, 0);

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
      matches: matches.slice(0, 10).map(m => ({
        id: m.id,
        date: m.scheduledAt,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        score: `${m.homeScore} - ${m.awayScore}`,
        status: m.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
