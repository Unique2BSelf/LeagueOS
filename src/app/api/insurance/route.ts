import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/insurance - Get user's current insurance status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all insurance policies for user
    const policies = await prisma.insurancePolicy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get active policy
    const activePolicy = policies.find(p => p.status === 'ACTIVE' && p.endDate > new Date());
    
    // Calculate days until expiry
    let daysUntilExpiry = null;
    let isExpired = false;
    let isExpiringSoon = false; // Within 30 days
    
    if (activePolicy) {
      const now = new Date();
      const daysRemaining = Math.ceil((activePolicy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = daysRemaining;
      isExpired = daysRemaining < 0;
      isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
    }

    return NextResponse.json({
      hasActiveInsurance: !!activePolicy && !isExpired,
      activePolicy,
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      policyHistory: policies,
    });
  } catch (error) {
    console.error('Error fetching insurance:', error);
    return NextResponse.json({ error: 'Failed to fetch insurance' }, { status: 500 });
  }
}

// POST /api/insurance - Purchase new insurance policy (365-day token per PRD)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider = 'LEAGUE_PROVIDED', cost = 50.00 } = await request.json();

    // Check for existing active policy
    const existing = await prisma.insurancePolicy.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Active policy already exists',
        policy: existing,
        expiresAt: existing.endDate,
      }, { status: 400 });
    }

    // Create new 365-day policy
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 365); // 365-day token per PRD

    const policy = await prisma.insurancePolicy.create({
      data: {
        userId,
        provider,
        startDate,
        endDate,
        cost,
        status: 'ACTIVE',
      },
    });

    // Update user's insurance status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isInsured: true,
        insuranceExpiry: endDate,
      },
    });

    return NextResponse.json({
      policy,
      message: 'Insurance purchased successfully. Valid for 365 days.',
    });
  } catch (error) {
    console.error('Error purchasing insurance:', error);
    return NextResponse.json({ error: 'Failed to purchase insurance' }, { status: 500 });
  }
}

// PATCH /api/insurance - Renew/extend insurance
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, policyId } = await request.json();

    if (action === 'renew') {
      // Find existing policy
      const existing = await prisma.insurancePolicy.findUnique({
        where: { id: policyId },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
      }

      // Calculate new dates (extend from current end date or now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 365);

      const renewed = await prisma.insurancePolicy.create({
        data: {
          userId,
          provider: existing.provider,
          startDate,
          endDate,
          cost: existing.cost,
          status: 'ACTIVE',
        },
      });

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          isInsured: true,
          insuranceExpiry: endDate,
        },
      });

      return NextResponse.json({
        policy: renewed,
        message: 'Insurance renewed for another 365 days.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating insurance:', error);
    return NextResponse.json({ error: 'Failed to update insurance' }, { status: 500 });
  }
}
