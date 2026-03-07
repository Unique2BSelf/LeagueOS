import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRefActor, getRefMatchRate } from '@/lib/referees';

// Generate 1099-NEC PDF data for referees
export async function GET(request: NextRequest) {
  const actor = await getRefActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all ref payouts for the year
    const year = new Date().getFullYear();
    const matches = await prisma.match.findMany({
      where: {
        refId: actor.id,
        status: 'FINAL',
        scheduledAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
        season: true,
      },
    });

    let totalEarnings = 0;
    const payments = matches.map(m => {
      const divisionLevel = m.homeTeam.division?.level ?? m.awayTeam.division?.level ?? 3;
      const rate = getRefMatchRate(divisionLevel);
      totalEarnings += rate;
      return {
        date: m.scheduledAt,
        amount: rate,
        description: `Referee services - ${m.season?.name || 'Recreational'}`,
      };
    });

    // Generate 1099 data
    const is1099Required = totalEarnings >= 600;
    
    // In production, this would generate an actual PDF
    // For now, return the data structure
    const taxData = {
      // Form 1099-NEC fields
      recipientName: user.fullName,
      recipientTIN: user.taxIdEncrypted || 'XXX-XX-XXXX', // Would decrypt in production
      recipientAddress: '', // Would need to add address field
      recipientEmail: user.email,
      
      // Payer info (league info)
      payerName: 'Pathfinder Outdoor Soccer League',
      payerTIN: 'XX-XXXXXXX',
      
      // Amount
      totalNonemployeeCompensation: totalEarnings,
      is1099Required,
      
      // Year
      taxYear: year,
      
      // Payments detail
      payments,
      
      // Status
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(taxData);
  } catch (error) {
    console.error('Error generating 1099:', error);
    return NextResponse.json({ error: 'Failed to generate 1099' }, { status: 500 });
  }
}

// Admin: Generate 1099 for any referee
export async function POST(request: NextRequest) {
  const actor = await getRefActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin
  if (actor.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { targetUserId, taxYear } = await request.json();

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const matches = await prisma.match.findMany({
      where: {
        refId: targetUserId,
        status: 'FINAL',
        scheduledAt: {
          gte: new Date(`${taxYear}-01-01`),
          lte: new Date(`${taxYear}-12-31`),
        },
      },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
        season: true,
      },
    });

    const totalEarnings = matches.reduce((sum, m) => 
      sum + getRefMatchRate(m.homeTeam.division?.level ?? m.awayTeam.division?.level ?? 3), 0);

    return NextResponse.json({
      recipientName: targetUser.fullName,
      recipientEmail: targetUser.email,
      taxYear,
      totalEarnings,
      is1099Required: totalEarnings >= 600,
      gamesWorked: matches.length,
      message: totalEarnings >= 600 
        ? '1099-NEC required - generate and send to recipient'
        : 'Amount below $600 threshold - no 1099 required',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
