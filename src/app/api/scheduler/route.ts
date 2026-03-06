import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEquitySchedule, 
  calculateLeagueAverage,
  hasJerseyConflict,
  suggestFieldSwap,
  type Team,
  type Field,
  type ScheduledMatch 
} from '@/lib/equityScheduler';

// Mock data - in production, fetch from Prisma
const mockTeams: Team[] = [
  { id: 'team-1', name: 'Thunder FC', divisionId: 'div-1', divisionLevel: 1, qualityScore: 150, preferredTimes: ['morning', 'afternoon'], preferredFields: ['field-1'], blackoutDates: [] },
  { id: 'team-2', name: 'Velocity SC', divisionId: 'div-1', divisionLevel: 1, qualityScore: 145, preferredTimes: ['afternoon'], preferredFields: ['field-1', 'field-2'], blackoutDates: ['2026-03-15'] },
  { id: 'team-3', name: 'Apex United', divisionId: 'div-1', divisionLevel: 1, qualityScore: 155, preferredTimes: ['morning'], preferredFields: ['field-2'], blackoutDates: [] },
  { id: 'team-4', name: 'Phoenix FC', divisionId: 'div-2', divisionLevel: 2, qualityScore: 120, preferredTimes: ['afternoon', 'evening'], preferredFields: ['field-1'], blackoutDates: [] },
  { id: 'team-5', name: 'Eagle Rangers', divisionId: 'div-2', divisionLevel: 2, qualityScore: 125, preferredTimes: ['morning'], preferredFields: ['field-2', 'field-3'], blackoutDates: [] },
  { id: 'team-6', name: 'Wolf Pack', divisionId: 'div-2', divisionLevel: 2, qualityScore: 130, preferredTimes: ['afternoon'], preferredFields: ['field-1'], blackoutDates: [] },
];

const mockFields: Field[] = [
  { id: 'field-1', name: 'Main Field', location: 'Sports Complex A', qualityScore: 5 },
  { id: 'field-2', name: 'North Field', location: 'Sports Complex A', qualityScore: 4 },
  { id: 'field-3', name: 'East Field', location: 'Sports Complex B', qualityScore: 3 },
];

// Mock existing matches
let existingMatches: ScheduledMatch[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'teams') {
    return NextResponse.json({ teams: mockTeams });
  }
  
  if (action === 'fields') {
    return NextResponse.json({ fields: mockFields });
  }
  
  if (action === 'stats') {
    const leagueAverage = calculateLeagueAverage(mockTeams);
    return NextResponse.json({
      totalTeams: mockTeams.length,
      divisions: [...new Set(mockTeams.map(t => t.divisionLevel))],
      leagueAverageQualityScore: leagueAverage,
      totalFields: mockFields.length,
      scheduledMatches: existingMatches.length,
    });
  }
  
  if (action === 'matches') {
    return NextResponse.json({ matches: existingMatches });
  }
  
  return NextResponse.json({
    message: 'Use POST to generate schedule',
    endpoints: {
      'GET ?action=teams': 'List all teams',
      'GET ?action=fields': 'List all fields',
      'GET ?action=stats': 'Get scheduler statistics',
      'GET ?action=matches': 'Get existing matches',
      'POST': 'Generate new schedule',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates, action } = body;
    
    if (action === 'generate') {
      if (!dates || !Array.isArray(dates)) {
        return NextResponse.json(
          { error: 'dates array is required' },
          { status: 400 }
        );
      }
      
      const result = generateEquitySchedule(
        mockTeams,
        mockFields,
        dates,
        {
          gamesPerTeam: 10,
          maxGamesPerDay: 2,
          avoidSameDayRematches: true,
          maxQualityScoreVariance: 0.1,
        },
        existingMatches
      );
      
      // Replace existing matches with new schedule
      existingMatches = result.matches;
      
      return NextResponse.json({
        success: true,
        generatedMatches: result.matches.length,
        conflicts: result.conflicts,
        qualityViolations: result.qualityViolations,
        matches: result.matches,
        stats: {
          totalMatches: result.matches.length,
          teams: mockTeams.length,
          dates: dates.length,
          leagueAverage: calculateLeagueAverage(mockTeams),
        },
      });
    }
    
    if (action === 'check-jersey') {
      const { homeColor, awayColor, homeTeam, awayTeam } = body;
      
      const hasConflict = hasJerseyConflict(homeColor, awayColor);
      
      return NextResponse.json({
        homeTeam,
        awayTeam,
        homeColor,
        awayColor,
        hasConflict,
        recommendation: hasConflict 
          ? 'Away team should wear secondary kit' 
          : 'No jersey conflict detected',
      });
    }
    
    if (action === 'suggest-swap') {
      const { matchId } = body;
      
      const match = existingMatches.find(m => m.matchId === matchId);
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }
      
      const suggestions = suggestFieldSwap(match, mockFields, existingMatches);
      
      return NextResponse.json({
        match,
        suggestions,
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reset schedule
export async function DELETE(request: NextRequest) {
  existingMatches = [];
  return NextResponse.json({
    success: true,
    message: 'Schedule cleared',
  });
}
