import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calculate pro-rated fee based on season dates
export function calculateProRatedFee(
  baseFee: number,
  seasonStart: Date,
  seasonEnd: Date | null,
  registrationDate: Date = new Date()
): number {
  if (!seasonEnd) {
    // If no end date, use full fee
    return baseFee;
  }

  const totalDays = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((seasonEnd.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 0) {
    // Season already ended
    return 0;
  }
  
  const daysPassed = totalDays - daysRemaining;
  const percentRemaining = daysRemaining / totalDays;
  
  // Pro-rated: pay only for remaining portion of season
  return Math.round(baseFee * percentRemaining * 100) / 100;
}

// GET /api/pricing/prorated - Calculate pro-rated fee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const baseFee = parseFloat(searchParams.get('baseFee') || '150');

    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const now = new Date();
    const proRatedFee = calculateProRatedFee(
      baseFee,
      season.startDate,
      season.endDate,
      now
    );

    const totalDays = season.endDate 
      ? Math.ceil((season.endDate.getTime() - season.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const daysRemaining = season.endDate
      ? Math.ceil((season.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      seasonId,
      baseFee,
      proRatedFee,
      isMidSeason: daysRemaining < totalDays * 0.5,
      daysRemaining,
      totalDays,
      percentRemaining: totalDays > 0 ? Math.round((daysRemaining / totalDays) * 100) : 100,
      message: daysRemaining <= 0 ? 'Season has ended' : 
               daysRemaining < totalDays * 0.5 ? 'Mid-season rate applied' : 'Full season rate',
    });
  } catch (error) {
    console.error('Error calculating prorated fee:', error);
    return NextResponse.json({ error: 'Failed to calculate fee' }, { status: 500 });
  }
}
