import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  generateEquitySchedule, 
  calculateLeagueAverage,
  hasJerseyConflict,
  suggestFieldSwap,
  type Team,
  type Field,
  type ScheduledMatch 
} from '@/lib/equityScheduler';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    // Get all teams with their division info
    if (action === 'teams') {
      const teams = await prisma.team.findMany({
        where: { approvalStatus: 'APPROVED' },
        include: { division: true },
      });
      
      const formattedTeams: Team[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        divisionId: t.divisionId,
        divisionLevel: t.division?.level || 1,
        qualityScore: 100, // Could calculate from win/loss record
        preferredTimes: [],
        preferredFields: [],
        blackoutDates: [],
      }));
      
      return NextResponse.json({ teams: formattedTeams });
    }
    
    // Get all fields with location info
    if (action === 'fields') {
      const fields = await prisma.field.findMany({
        include: { location: true },
      });
      
      const formattedFields: Field[] = fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location.name,
        qualityScore: f.qualityScore,
      }));
      
      return NextResponse.json({ fields: formattedFields });
    }
    
    // Get locations for nesting
    if (action === 'locations') {
      const locations = await prisma.location.findMany({
        include: { fields: true },
      });
      return NextResponse.json({ locations });
    }
    
    // Get scheduler stats
    if (action === 'stats') {
      const teams = await prisma.team.findMany({
        where: { approvalStatus: 'APPROVED' },
      });
      const fields = await prisma.field.findMany({ include: { location: true } });
      const matches = await prisma.match.findMany();
      
      const teamQualityScores = teams.map(t => 100); // Placeholder
      const leagueAverage = teamQualityScores.length > 0 
        ? teamQualityScores.reduce((a, b) => a + b, 0) / teamQualityScores.length 
        : 100;
      
      return NextResponse.json({
        totalTeams: teams.length,
        divisions: [...new Set(teams.map(t => t.divisionId))],
        leagueAverageQualityScore: leagueAverage,
        totalFields: fields.length,
        scheduledMatches: matches.length,
      });
    }
    
    // Get existing matches
    if (action === 'matches') {
      const seasonId = searchParams.get('seasonId');
      
      const matches = await prisma.match.findMany({
        where: seasonId ? { seasonId } : undefined,
        include: {
          homeTeam: true,
          awayTeam: true,
          field: { include: { location: true } },
          ref: { select: { id: true, fullName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
      
      const formattedMatches = matches.map(m => ({
        matchId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeTeamName: m.homeTeam?.name,
        awayTeamName: m.awayTeam?.name,
        fieldId: m.fieldId,
        fieldName: m.field?.name,
        locationName: m.field?.location?.name,
        timeSlot: m.scheduledAt.toISOString().split('T')[1].slice(0, 5),
        date: m.scheduledAt.toISOString().split('T')[0],
        matchType: m.matchType,
        gameLengthMinutes: m.gameLengthMinutes,
        refId: m.refId,
        refName: m.ref?.fullName,
        status: m.status,
      }));
      
      return NextResponse.json({ matches: formattedMatches });
    }
    
    // Get refs for assignment
    if (action === 'refs') {
      const refs = await prisma.user.findMany({
        where: { role: 'REF', isActive: true },
        select: { id: true, fullName: true, email: true },
      });
      return NextResponse.json({ refs });
    }
    
    return NextResponse.json({
      message: 'Use POST to generate schedule',
      endpoints: {
        'GET ?action=teams': 'List all approved teams',
        'GET ?action=fields': 'List all fields with locations',
        'GET ?action=locations': 'List locations with nested fields',
        'GET ?action=refs': 'List available referees',
        'GET ?action=stats': 'Get scheduler statistics',
        'GET ?action=matches': 'Get existing matches',
        'POST': 'Generate new schedule',
      },
    });
  } catch (error) {
    console.error('Scheduler API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dates, 
      action, 
      seasonId, 
      matchType = 'REGULAR', 
      gameLengthMinutes = 60,
      includeFriendlies = false,
      matchIds,
      refAssignments 
    } = body;
    
    // Generate new schedule
    if (action === 'generate') {
      if (!dates || !Array.isArray(dates)) {
        return NextResponse.json(
          { error: 'dates array is required' },
          { status: 400 }
        );
      }
      
      // Fetch teams from DB
      const teams = await prisma.team.findMany({
        where: { approvalStatus: 'APPROVED' },
        include: { division: true },
      });
      
      // Fetch fields from DB
      const fields = await prisma.field.findMany({
        include: { location: true },
      });
      
      const formattedTeams: Team[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        divisionId: t.divisionId,
        divisionLevel: t.division?.level || 1,
        qualityScore: 100,
        preferredTimes: [],
        preferredFields: [],
        blackoutDates: [],
      }));
      
      const formattedFields: Field[] = fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location.name,
        qualityScore: f.qualityScore,
      }));
      
      // Generate schedule using equity algorithm
      const result = generateEquitySchedule(
        formattedTeams,
        formattedFields,
        dates,
        {
          gamesPerTeam: 10,
          maxGamesPerDay: 2,
          avoidSameDayRematches: true,
          maxQualityScoreVariance: 0.1,
        }
      );
      
      // Save matches to database
      const defaultSeasonId = seasonId || (await prisma.season.findFirst())?.id || 'season-1';
      
      const savedMatches = await Promise.all(
        result.matches.map(async (m, index) => {
          // Parse date and time
          const [year, month, day] = m.date.split('-').map(Number);
          const [hours, minutes] = m.timeSlot.split(':').map(Number);
          const scheduledAt = new Date(year, month - 1, day, hours, minutes);
          
          return prisma.match.create({
            data: {
              scheduledAt,
              fieldId: m.fieldId,
              homeTeamId: m.homeTeamId,
              awayTeamId: m.awayTeamId,
              seasonId: defaultSeasonId,
              matchType: matchType as any,
              gameLengthMinutes,
              status: 'SCHEDULED',
            },
          });
        })
      );
      
      return NextResponse.json({
        success: true,
        generatedMatches: savedMatches.length,
        conflicts: result.conflicts,
        qualityViolations: result.qualityViolations,
        matches: savedMatches.map(m => ({
          matchId: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          fieldId: m.fieldId,
          timeSlot: m.scheduledAt.toISOString().split('T')[1].slice(0, 5),
          date: m.scheduledAt.toISOString().split('T')[0],
        })),
        stats: {
          totalMatches: savedMatches.length,
          teams: teams.length,
          dates: dates.length,
          leagueAverage: calculateLeagueAverage(formattedTeams),
        },
      });
    }
    
    // Assign referees to matches
    if (action === 'assign-refs') {
      if (!matchIds || !Array.isArray(matchIds) || !refAssignments) {
        return NextResponse.json(
          { error: 'matchIds array and refAssignments object required' },
          { status: 400 }
        );
      }
      
      const updates = await Promise.all(
        Object.entries(refAssignments).map(([matchId, refId]) =>
          prisma.match.update({
            where: { id: matchId },
            data: { refId: refId as string },
          })
        )
      );
      
      return NextResponse.json({
        success: true,
        updated: updates.length,
      });
    }
    
    // Update match details (type, length)
    if (action === 'update-match') {
      const { matchId, matchType: newMatchType, gameLengthMinutes: newLength } = body;
      
      const updateData: any = {};
      if (newMatchType) updateData.matchType = newMatchType;
      if (newLength) updateData.gameLengthMinutes = newLength;
      
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });
      
      return NextResponse.json({ success: true, match: updated });
    }
    
    // Create friendly or bye match
    if (action === 'create-special') {
      const { homeTeamId, awayTeamId, fieldId, date, time, matchType: specialType, seasonId: specialSeasonId } = body;
      
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = (time || '10:00').split(':').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hours, minutes);
      
      const seasonIdValue = specialSeasonId || (await prisma.season.findFirst())?.id || 'season-1';
      
      const match = await prisma.match.create({
        data: {
          scheduledAt,
          fieldId,
          homeTeamId,
          awayTeamId: specialType === 'BYE' ? null : awayTeamId,
          seasonId: seasonIdValue,
          matchType: specialType as any,
          gameLengthMinutes: gameLengthMinutes,
          status: 'SCHEDULED',
        },
      });
      
      return NextResponse.json({ success: true, match });
    }
    
    // Check jersey conflict
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
    
    // Suggest field swap
    if (action === 'suggest-swap') {
      const { matchId } = body;
      
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });
      
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }
      
      const allMatches = await prisma.match.findMany({
        where: { 
          scheduledAt: match.scheduledAt,
          fieldId: match.fieldId,
        },
      });
      
      const fields = await prisma.field.findMany({ include: { location: true } });
      const scheduledMatch: ScheduledMatch = {
        matchId: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId || '',
        fieldId: match.fieldId,
        timeSlot: match.scheduledAt.toISOString().split('T')[1].slice(0, 5),
        date: match.scheduledAt.toISOString().split('T')[0],
      };
      
      const formattedFields = fields.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location?.name || '',
        qualityScore: f.qualityScore,
      }));
      
      const suggestions = suggestFieldSwap(scheduledMatch, formattedFields, allMatches.map(m => ({
        matchId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId || '',
        fieldId: m.fieldId,
        timeSlot: m.scheduledAt.toISOString().split('T')[1].slice(0, 5),
        date: m.scheduledAt.toISOString().split('T')[0],
      })));
      
      return NextResponse.json({ match, suggestions });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scheduler POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  
  try {
    if (matchId) {
      await prisma.match.delete({ where: { id: matchId } });
      return NextResponse.json({ success: true, message: 'Match deleted' });
    }
    
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
