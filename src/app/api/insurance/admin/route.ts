import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/insurance/admin - Get all players with insurance status (admin)
export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // all, insured, expiring, expired

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all players with their insurance status
    const players = await prisma.user.findMany({
      where: {
        role: 'PLAYER',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isInsured: true,
        insuranceExpiry: true,
      },
      orderBy: { fullName: 'asc' },
    });

    // Get active insurance policies
    const policies = await prisma.insurancePolicy.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        policyNumber: true,
        startDate: true,
        endDate: true,
        cost: true,
      },
    });

    const policyMap = new Map(policies.map(p => [p.userId, p]));

    // Enrich player data with policy info
    const enrichedPlayers = players.map(player => {
      const policy = policyMap.get(player.id);
      const insuranceExpiry = player.insuranceExpiry ? new Date(player.insuranceExpiry) : null;
      const hasActiveInsurance = player.isInsured && insuranceExpiry && insuranceExpiry > now;
      const isExpiringSoon = hasActiveInsurance && insuranceExpiry && insuranceExpiry <= thirtyDaysFromNow;
      const isExpired = insuranceExpiry && insuranceExpiry <= now;

      return {
        id: player.id,
        fullName: player.fullName,
        email: player.email,
        isInsured: hasActiveInsurance,
        insuranceExpiry: insuranceExpiry ? insuranceExpiry.toISOString() : null,
        daysUntilExpiry: insuranceExpiry 
          ? Math.ceil((insuranceExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon,
        isExpired,
        policy: policy || null,
      };
    });

    // Filter based on query param
    let filteredPlayers = enrichedPlayers;
    if (filter === 'insured') {
      filteredPlayers = enrichedPlayers.filter(p => p.isInsured && !p.isExpired);
    } else if (filter === 'expiring') {
      filteredPlayers = enrichedPlayers.filter(p => p.isExpiringSoon);
    } else if (filter === 'expired') {
      filteredPlayers = enrichedPlayers.filter(p => p.isExpired || (!p.isInsured && !p.isExpiringSoon));
    }

    // Calculate stats
    const totalPlayers = enrichedPlayers.length;
    const insuredCount = enrichedPlayers.filter(p => p.isInsured && !p.isExpired).length;
    const expiringSoonCount = enrichedPlayers.filter(p => p.isExpiringSoon).length;
    const expiredCount = enrichedPlayers.filter(p => p.isExpired).length;

    return NextResponse.json({
      players: filteredPlayers,
      stats: {
        totalPlayers,
        insuredCount,
        insuredPercent: totalPlayers > 0 ? Math.round((insuredCount / totalPlayers) * 100) : 0,
        expiringSoonCount,
        expiredCount,
      },
    });
  } catch (error) {
    console.error('Error fetching insurance admin data:', error);
    return NextResponse.json({ error: 'Failed to fetch insurance data' }, { status: 500 });
  }
}

// POST /api/insurance/admin - Purchase insurance for users (bulk)
export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { action, playerIds, cost = 50.00 } = await request.json();

    if (action === 'purchase_bulk' && playerIds && Array.isArray(playerIds)) {
      const results = [];

      for (const targetUserId of playerIds) {
        // Check for existing active policy
        const existing = await prisma.insurancePolicy.findFirst({
          where: {
            userId: targetUserId,
            status: 'ACTIVE',
            endDate: { gt: new Date() },
          },
        });

        if (existing) {
          results.push({ userId: targetUserId, success: false, error: 'Already has active insurance' });
          continue;
        }

        // Create new 365-day policy
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365);

        const policy = await prisma.insurancePolicy.create({
          data: {
            userId: targetUserId,
            provider: 'LEAGUE_PROVIDED',
            startDate,
            endDate,
            cost,
            status: 'ACTIVE',
          },
        });

        // Update user's insurance status
        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            isInsured: true,
            insuranceExpiry: endDate,
          },
        });

        await createAuditLog({
          actor,
          actionType: 'ACTIVATE',
          entityType: 'INSURANCE_POLICY',
          entityId: policy.id,
          after: {
            userId: targetUserId,
            provider: policy.provider,
            startDate: policy.startDate.toISOString(),
            endDate: policy.endDate.toISOString(),
            cost: policy.cost,
            status: policy.status,
          },
          notes: 'Bulk insurance purchase by admin',
        });

        results.push({ userId: targetUserId, success: true, policy });
      }

      return NextResponse.json({
        message: `Processed ${results.length} players`,
        results,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in insurance admin action:', error);
    return NextResponse.json({ error: 'Failed to process insurance action' }, { status: 500 });
  }
}
