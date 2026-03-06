import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateEquitySchedule,
  calculateLeagueAverage,
  hasJerseyConflict,
  suggestFieldSwap,
  type Team,
  type Field,
  type ScheduledMatch,
} from '@/lib/equityScheduler';

async function getSeasonId(preferredSeasonId?: string) {
  if (preferredSeasonId) {
    return preferredSeasonId;
  }

  const season = await prisma.season.findFirst({ orderBy: { startDate: 'desc' } });
  return season?.id ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'teams') {
      const teams = await prisma.team.findMany({
        where: { approvalStatus: 'APPROVED' },
        include: { division: true },
      });

      const formattedTeams: Team[] = teams.map((team) => ({
        id: team.id,
        name: team.name,
        divisionId: team.divisionId,
        divisionLevel: team.division?.level || 1,
        qualityScore: 100,
        preferredTimes: [],
        preferredFields: [],
        blackoutDates: [],
      }));

      return NextResponse.json({ teams: formattedTeams });
    }

    if (action === 'fields') {
      const fields = await prisma.field.findMany({ include: { location: true } });
      const formattedFields: Field[] = fields.map((field) => ({
        id: field.id,
        name: field.name,
        location: field.location.name,
        qualityScore: field.qualityScore,
      }));

      return NextResponse.json({ fields: formattedFields });
    }

    if (action === 'locations') {
      const locations = await prisma.location.findMany({ include: { fields: true } });
      return NextResponse.json({ locations });
    }

    if (action === 'stats') {
      const teams = await prisma.team.findMany({ where: { approvalStatus: 'APPROVED' } });
      const fields = await prisma.field.findMany({ include: { location: true } });
      const matches = await prisma.match.findMany();

      const teamQualityScores = teams.map(() => 100);
      const leagueAverage = teamQualityScores.length > 0
        ? teamQualityScores.reduce((sum, value) => sum + value, 0) / teamQualityScores.length
        : 100;

      return NextResponse.json({
        totalTeams: teams.length,
        divisions: [...new Set(teams.map((team) => team.divisionId))],
        leagueAverageQualityScore: leagueAverage,
        totalFields: fields.length,
        scheduledMatches: matches.length,
      });
    }

    if (action === 'matches') {
      const seasonId = searchParams.get('seasonId') || undefined;
      const matches = await prisma.match.findMany({
        where: seasonId ? { seasonId } : undefined,
        include: {
          homeTeam: true,
          awayTeam: true,
          ref: { select: { id: true, fullName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      const fieldIds = [...new Set(matches.map((match) => match.fieldId))];
      const fields = fieldIds.length > 0
        ? await prisma.field.findMany({
            where: { id: { in: fieldIds } },
            include: { location: true },
          })
        : [];
      const fieldsById = new Map(fields.map((field) => [field.id, field]));

      const formattedMatches = matches.map((match) => {
        const field = fieldsById.get(match.fieldId);

        return {
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeam?.name,
          awayTeamName: match.awayTeam?.name,
          fieldId: match.fieldId,
          fieldName: field?.name ?? 'Unknown Field',
          locationName: field?.location?.name ?? 'Unknown Location',
          timeSlot: match.scheduledAt.toISOString().split('T')[1].slice(0, 5),
          date: match.scheduledAt.toISOString().split('T')[0],
          matchType: 'REGULAR',
          gameLengthMinutes: 60,
          refId: match.refId,
          refName: match.ref?.fullName,
          status: match.status,
        };
      });

      return NextResponse.json({ matches: formattedMatches });
    }

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
        POST: 'Generate new schedule',
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
      matchIds,
      refAssignments,
    } = body;

    if (action === 'generate') {
      if (!dates || !Array.isArray(dates)) {
        return NextResponse.json({ error: 'dates array is required' }, { status: 400 });
      }

      const teams = await prisma.team.findMany({
        where: { approvalStatus: 'APPROVED' },
        include: { division: true },
      });
      const fields = await prisma.field.findMany({ include: { location: true } });

      const formattedTeams: Team[] = teams.map((team) => ({
        id: team.id,
        name: team.name,
        divisionId: team.divisionId,
        divisionLevel: team.division?.level || 1,
        qualityScore: 100,
        preferredTimes: [],
        preferredFields: [],
        blackoutDates: [],
      }));

      const formattedFields: Field[] = fields.map((field) => ({
        id: field.id,
        name: field.name,
        location: field.location.name,
        qualityScore: field.qualityScore,
      }));

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

      const targetSeasonId = await getSeasonId(seasonId);
      if (!targetSeasonId) {
        return NextResponse.json({ error: 'No season found for generated matches' }, { status: 400 });
      }

      const savedMatches = await Promise.all(
        result.matches.map(async (match) => {
          const [year, month, day] = match.date.split('-').map(Number);
          const [hours, minutes] = match.timeSlot.split(':').map(Number);
          const scheduledAt = new Date(year, month - 1, day, hours, minutes);

          return prisma.match.create({
            data: {
              scheduledAt,
              fieldId: match.fieldId,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              seasonId: targetSeasonId,
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
        matches: savedMatches.map((match) => ({
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          fieldId: match.fieldId,
          timeSlot: match.scheduledAt.toISOString().split('T')[1].slice(0, 5),
          date: match.scheduledAt.toISOString().split('T')[0],
        })),
        stats: {
          totalMatches: savedMatches.length,
          teams: teams.length,
          dates: dates.length,
          leagueAverage: calculateLeagueAverage(formattedTeams),
        },
      });
    }

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
            data: { refId: String(refId) },
          })
        )
      );

      return NextResponse.json({ success: true, updated: updates.length });
    }

    if (action === 'update-match') {
      const { matchId } = body;
      if (!matchId) {
        return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
      }

      const updated = await prisma.match.findUnique({ where: { id: matchId } });
      return NextResponse.json({ success: true, match: updated });
    }

    if (action === 'create-special') {
      const { homeTeamId, awayTeamId, fieldId, date, time, seasonId: specialSeasonId } = body;

      if (!homeTeamId || !awayTeamId || !fieldId || !date) {
        return NextResponse.json({ error: 'homeTeamId, awayTeamId, fieldId, and date are required' }, { status: 400 });
      }

      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = String(time || '10:00').split(':').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hours, minutes);
      const targetSeasonId = await getSeasonId(specialSeasonId);

      if (!targetSeasonId) {
        return NextResponse.json({ error: 'No season found for special match' }, { status: 400 });
      }

      const match = await prisma.match.create({
        data: {
          scheduledAt,
          fieldId,
          homeTeamId,
          awayTeamId,
          seasonId: targetSeasonId,
          status: 'SCHEDULED',
        },
      });

      return NextResponse.json({ success: true, match });
    }

    if (action === 'check-jersey') {
      const { homeColor, awayColor, homeTeam, awayTeam } = body;
      const conflict = hasJerseyConflict(homeColor, awayColor);

      return NextResponse.json({
        homeTeam,
        awayTeam,
        homeColor,
        awayColor,
        hasConflict: conflict,
        recommendation: conflict ? 'Away team should wear secondary kit' : 'No jersey conflict detected',
      });
    }

    if (action === 'suggest-swap') {
      const { matchId } = body;
      const match = await prisma.match.findUnique({ where: { id: matchId } });

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
        awayTeamId: match.awayTeamId,
        fieldId: match.fieldId,
        timeSlot: match.scheduledAt.toISOString().split('T')[1].slice(0, 5),
        date: match.scheduledAt.toISOString().split('T')[0],
      };

      const formattedFields: Field[] = fields.map((field) => ({
        id: field.id,
        name: field.name,
        location: field.location.name,
        qualityScore: field.qualityScore,
      }));

      const suggestions = suggestFieldSwap(
        scheduledMatch,
        formattedFields,
        allMatches.map((existingMatch) => ({
          matchId: existingMatch.id,
          homeTeamId: existingMatch.homeTeamId,
          awayTeamId: existingMatch.awayTeamId,
          fieldId: existingMatch.fieldId,
          timeSlot: existingMatch.scheduledAt.toISOString().split('T')[1].slice(0, 5),
          date: existingMatch.scheduledAt.toISOString().split('T')[0],
        }))
      );

      return NextResponse.json({ match, suggestions });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scheduler POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  try {
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }

    await prisma.match.delete({ where: { id: matchId } });
    return NextResponse.json({ success: true, message: 'Match deleted' });
  } catch (error) {
    console.error('Scheduler DELETE error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
