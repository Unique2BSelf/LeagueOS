import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/captain-credits - Get team's captain credits
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId required' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        captainCredits: true,
        captainCreditUsage: true,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}

// POST /api/captain-credits - Add credits to a team (admin)
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

    const { teamId, amount, reason } = await request.json();

    if (!teamId || !amount) {
      return NextResponse.json({ error: 'teamId and amount required' }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        captainCredits: { increment: amount },
      },
    });

    return NextResponse.json({
      success: true,
      credits: team.captainCredits,
      message: `Added ${amount} credits to ${team.name}`,
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
  }
}

// PATCH /api/captain-credits - Use credits (captain)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, amount, playerId, description } = await request.json();

    if (!teamId || !amount) {
      return NextResponse.json({ error: 'teamId and amount required' }, { status: 400 });
    }

    // Get team and verify captain
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.captainId !== userId) {
      return NextResponse.json({ error: 'Only team captain can use credits' }, { status: 403 });
    }

    // Check if enough credits
    const availableCredits = team.captainCredits - team.captainCreditUsage;
    if (amount > availableCredits) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
    }

    // Use credits
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        captainCreditUsage: { increment: amount },
      },
    });

    return NextResponse.json({
      success: true,
      creditsRemaining: updated.captainCredits - updated.captainCreditUsage,
      message: `Used ${amount} credits for ${description || 'team'}`,
    });
  } catch (error) {
    console.error('Error using credits:', error);
    return NextResponse.json({ error: 'Failed to use credits' }, { status: 500 });
  }
}
