import { NextRequest, NextResponse } from 'next/server';
import { checkSubEligibility, calculateDivisionAverageElo } from '@/lib/subEligibility';

// Mock data - in production, fetch from Prisma
const mockPlayers: Record<string, any> = {
  'player-1': { id: 'player-1', eloRating: 1450, isGoalie: false, isInsured: true, homeDivision: 2 },
  'player-2': { id: 'player-2', eloRating: 1600, isGoalie: false, isInsured: true, homeDivision: 2 },
  'player-goalie': { id: 'player-goalie', eloRating: 1100, isGoalie: true, isInsured: true, homeDivision: 1 },
  'player-uninsured': { id: 'player-uninsured', eloRating: 1300, isGoalie: false, isInsured: false, homeDivision: 2 },
};

const mockMatches: Record<string, any> = {
  'match-1': { id: 'match-1', division: 2 },
  'match-2': { id: 'match-2', division: 3 },
};

const mockTeams: Record<string, any> = {
  'team-1': { id: 'team-1', subQuotaRemaining: 5 },
  'team-2': { id: 'team-2', subQuotaRemaining: 0 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, matchId, teamId } = body;
    
    if (!playerId || !matchId || !teamId) {
      return NextResponse.json(
        { error: 'playerId, matchId, and teamId are required' },
        { status: 400 }
      );
    }
    
    const player = mockPlayers[playerId];
    const match = mockMatches[matchId];
    const team = mockTeams[teamId];
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Calculate division average ELO (mock - in production query team players)
    const divisionAverageElo = calculateDivisionAverageElo([
      { eloRating: 1300 },
      { eloRating: 1400 },
      { eloRating: 1500 },
      { eloRating: 1450 },
    ]);
    
    const result = checkSubEligibility(player, match, team, divisionAverageElo);
    
    return NextResponse.json({
      player,
      match,
      team,
      divisionAverageElo,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const matchId = searchParams.get('matchId');
  
  // Return eligibility rules info
  return NextResponse.json({
    rules: {
      standard: 'player.homeDivision >= match.division - 1 && <= match.division + any higher',
      goalieException: 'if player.isGoalie === true → ignore division restriction',
      ringerFlag: 'if player.eloRating > (divisionAverage * 1.5) → notify admin/ref',
      insurance: 'Free for insured players only',
      quota: 'Seasonal quota per team; injury subs exempt from quota (admin approval)',
    },
    mockData: {
      players: Object.keys(mockPlayers),
      matches: Object.keys(mockMatches),
      teams: Object.keys(mockTeams),
    }
  });
}
