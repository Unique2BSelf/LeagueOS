import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { teams } from '../route';

// GET /api/teams/[id] - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First try in-memory storage
    const team = teams.get(id);
    
    if (team) {
      // Get division name if available
      let divisionName = 'Open Division'
      try {
        const division = await prisma.division.findFirst()
        if (division) divisionName = division.name
      } catch (e) {
        // Ignore prisma errors
      }
      
      return NextResponse.json({
        ...team,
        division: { name: divisionName },
        season: { name: 'Current Season' },
      });
    }
    
    // Try database
    try {
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
          inviteCode: dbTeam.inviteCode,
          inviteCodeExpiry: dbTeam.inviteCodeExpiry,
        });
      }
    } catch (e) {
      // Database not available, continue
    }
    
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}
