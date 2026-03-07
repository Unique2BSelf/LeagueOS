import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[id] - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
 
    const dbTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        division: true,
        season: true,
      },
    });

    if (dbTeam) {
      return NextResponse.json({
        id: dbTeam.id,
        name: dbTeam.name,
        captainId: dbTeam.captainId,
        divisionId: dbTeam.divisionId,
        division: dbTeam.division,
        season: dbTeam.season,
        primaryColor: dbTeam.primaryColor,
        secondaryColor: dbTeam.secondaryColor,
        currentBalance: dbTeam.currentBalance,
        escrowTarget: dbTeam.escrowTarget,
        isConfirmed: dbTeam.isConfirmed,
        approvalStatus: dbTeam.approvalStatus,
        rosterStatus: dbTeam.rosterStatus,
        isArchived: dbTeam.isArchived,
        inviteCode: dbTeam.inviteCode,
        inviteCodeExpiry: dbTeam.inviteCodeExpiry,
      });
    }
    
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}
