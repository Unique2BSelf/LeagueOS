import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pricing - Get pricing tiers for a season
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }

    const tiers = await prisma.pricingTier.findMany({
      where: { seasonId },
      orderBy: { startDate: 'asc' },
    });

    // Get current applicable tier
    const now = new Date();
    const currentTier = tiers.find(
      (tier) => now >= tier.startDate && now <= tier.endDate && tier.isActive
    );

    return NextResponse.json({
      tiers,
      currentTier,
      currentFee: currentTier?.amount || tiers[tiers.length - 1]?.amount || 150,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
  }
}

// POST /api/pricing - Create pricing tiers for a season (admin)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { seasonId, tiers } = await request.json();

    // Create tiers
    const created = await Promise.all(
      tiers.map((tier: { name: string; startDate: string; endDate: string; amount: number }) =>
        prisma.pricingTier.create({
          data: {
            seasonId,
            name: tier.name,
            startDate: new Date(tier.startDate),
            endDate: new Date(tier.endDate),
            amount: tier.amount,
          },
        })
      )
    );

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating pricing:', error);
    return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 });
  }
}
