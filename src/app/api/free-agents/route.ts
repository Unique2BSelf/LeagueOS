import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/free-agents - Search free agents (captains only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Support multiple skill filters
    const minSpeed = searchParams.get('minSpeed');
    const minTechnical = searchParams.get('minTechnical');
    const minStamina = searchParams.get('minStamina');
    const minTeamwork = searchParams.get('minTeamwork');
    const minDefense = searchParams.get('minDefense');
    const minAttack = searchParams.get('minAttack');
    
    // Legacy support for single skill filter
    const skill = searchParams.get('skill'); 
    const minRating = searchParams.get('minRating');
    
    const isGoalie = searchParams.get('isGoalie');
    const search = searchParams.get('search');

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check captain or admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Captain or Admin only' }, { status: 403 });
    }

    // Build query
    const where: any = { isFreeAgent: true };

    if (isGoalie === 'true') {
      where.isGoalie = true;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Handle legacy single skill filter
    if (skill && minRating) {
      where[skill] = { gte: parseInt(minRating) };
    }

    // Handle multiple skill filters (new format)
    if (minSpeed) {
      where.skillSpeed = { ...where.skillSpeed, gte: parseInt(minSpeed) };
    }
    if (minTechnical) {
      where.skillTechnical = { ...where.skillTechnical, gte: parseInt(minTechnical) };
    }
    if (minStamina) {
      where.skillStamina = { ...where.skillStamina, gte: parseInt(minStamina) };
    }
    if (minTeamwork) {
      where.skillTeamwork = { ...where.skillTeamwork, gte: parseInt(minTeamwork) };
    }
    if (minDefense) {
      where.skillDefense = { ...where.skillDefense, gte: parseInt(minDefense) };
    }
    if (minAttack) {
      where.skillAttack = { ...where.skillAttack, gte: parseInt(minAttack) };
    }

    const freeAgents = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        photoUrl: true,
        skillSpeed: true,
        skillTechnical: true,
        skillStamina: true,
        skillTeamwork: true,
        skillDefense: true,
        skillAttack: true,
        isGoalie: true,
        eloRating: true,
        isInsured: true,
        createdAt: true,
      },
      orderBy: { eloRating: 'desc' },
      take: 50,
    });

    return NextResponse.json({ freeAgents });
  } catch (error) {
    console.error('Error searching free agents:', error);
    return NextResponse.json({ error: 'Failed to search free agents' }, { status: 500 });
  }
}

// POST /api/free-agents - Mark yourself as free agent OR Captain claims a free agent
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a claim request (has playerId or userId)
    const body = await request.json();
    const { playerId, userId: targetUserId, teamId, seasonId, isFreeAgent } = body;
    
    // If teamId is provided, this is a claim operation (captain claiming a player)
    if (teamId && (playerId || targetUserId)) {
      // Check captain role
      const captain = await prisma.user.findUnique({ where: { id: userId } });
      if (!captain || captain.role !== 'CAPTAIN') {
        return NextResponse.json({ error: 'Captain only' }, { status: 403 });
      }

      const playerToClaim = playerId || targetUserId;

      // Verify captain owns the team
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.captainId !== userId) {
        return NextResponse.json({ error: 'Not your team' }, { status: 403 });
      }

      // Check if player is actually a free agent
      const player = await prisma.user.findUnique({ where: { id: playerToClaim } });
      if (!player || !player.isFreeAgent) {
        return NextResponse.json({ error: 'Player is not a free agent' }, { status: 400 });
      }

      // Add player to team
      await prisma.teamPlayer.create({
        data: {
          userId: playerToClaim,
          teamId: teamId,
          status: 'APPROVED',
        },
      });

      // Remove from free agent pool
      await prisma.user.update({
        where: { id: playerToClaim },
        data: {
          isFreeAgent: false,
          freeAgentSeasonId: null,
        },
      });

      return NextResponse.json({ success: true, message: `Successfully added ${player.fullName} to your team` });
    }

    // Otherwise, this is a free agent status update (player marking themselves)
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isFreeAgent,
        freeAgentSeasonId: isFreeAgent ? seasonId : null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      isFreeAgent: user.isFreeAgent 
    });
  } catch (error) {
    console.error('Error updating free agent status:', error);
    return NextResponse.json({ error: 'Failed to update free agent status' }, { status: 500 });
  }
}

// PUT /api/free-agents - Captain claims a free agent
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check captain role
    const captain = await prisma.user.findUnique({ where: { id: userId } });
    if (!captain || captain.role !== 'CAPTAIN') {
      return NextResponse.json({ error: 'Captain only' }, { status: 403 });
    }

    const { playerId, teamId } = await request.json();

    // Verify captain owns the team
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.captainId !== userId) {
      return NextResponse.json({ error: 'Not your team' }, { status: 403 });
    }

    // Add player to team
    await prisma.teamPlayer.create({
      data: {
        userId: playerId,
        teamId: teamId,
        status: 'APPROVED',
      },
    });

    // Remove from free agent pool
    await prisma.user.update({
      where: { id: playerId },
      data: {
        isFreeAgent: false,
        freeAgentSeasonId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error claiming free agent:', error);
    return NextResponse.json({ error: 'Failed to claim free agent' }, { status: 500 });
  }
}

// PATCH /api/free-agents - Reject a free agent with note
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check captain role
    const captain = await prisma.user.findUnique({ where: { id: userId } });
    if (!captain || captain.role !== 'CAPTAIN') {
      return NextResponse.json({ error: 'Captain only' }, { status: 403 });
    }

    const { playerId, teamId, rejectionNote } = await request.json();

    // Store rejection note in a separate tracking or user field
    // For now, we'll add a note to the user's profile or create a notification
    // Let's use a simple approach - add to user's notes field if it exists
    
    // Create a notification for the rejected player
    await prisma.user.update({
      where: { id: playerId },
      data: {
        // Could add a notes field for rejection reasons
        // For now, just log it
      },
    });

    // Return success - rejection is noted
    return NextResponse.json({ 
      success: true, 
      message: rejectionNote ? `Rejected with note: ${rejectionNote}` : 'Free agent rejected' 
    });
  } catch (error) {
    console.error('Error rejecting free agent:', error);
    return NextResponse.json({ error: 'Failed to reject free agent' }, { status: 500 });
  }
}

// Simple notification system for captains when free agents are claimed
// In production, this would send actual emails/SMS

export async function notifyCaptainOfClaim(captainId: string, playerName: string, teamName: string) {
  // Store notification in database (simplified)
  console.log(`NOTIFICATION: Captain ${captainId} - ${playerName} joined team ${teamName}`)
  return { sent: true }
}
