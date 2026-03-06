import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hasJerseyConflict,
  suggestFieldSwap,
  type Field,
  type ScheduledMatch,
} from '@/lib/equityScheduler';
import {
  generateSeasonSchedule,
  getScheduleMatches,
  getScheduleSummary,
  getSchedulerFields,
  getSchedulerSeasons,
  getSchedulerTeamsBySeason,
} from '@/lib/schedule';
import { getAdminActor } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const seasonId = searchParams.get('seasonId');

  try {
    if (action === 'seasons') {
      const seasons = await getSchedulerSeasons();
      return NextResponse.json({ seasons });
    }

    if (action === 'teams') {
      const teams = await getSchedulerTeamsBySeason(seasonId);
      return NextResponse.json({ teams });
    }

    if (action === 'fields') {
      const fields = await getSchedulerFields();
      return NextResponse.json({ fields });
    }

    if (action === 'locations') {
      const locations = await prisma.location.findMany({ include: { fields: true } });
      return NextResponse.json({ locations });
    }

    if (action === 'stats') {
      const stats = await getScheduleSummary(seasonId);
      return NextResponse.json(stats);
    }

    if (action === 'matches') {
      const matches = await getScheduleMatches(seasonId);
      return NextResponse.json({ matches });
    }

    if (action === 'refs') {
      const refs = await prisma.user.findMany({
        where: { role: 'REF', isActive: true },
        select: { id: true, fullName: true, email: true },
      });

      return NextResponse.json({ refs });
    }

    return NextResponse.json({
      message: 'Use POST to generate or update a schedule',
      endpoints: {
        'GET ?action=seasons': 'List available seasons for scheduling',
        'GET ?action=teams&seasonId=...': 'List approved teams in a season',
        'GET ?action=fields': 'List all fields with locations',
        'GET ?action=locations': 'List locations with nested fields',
        'GET ?action=refs': 'List available referees',
        'GET ?action=stats&seasonId=...': 'Get scheduler statistics for a season',
        'GET ?action=matches&seasonId=...': 'Get persisted matches for a season',
        POST: 'Generate new schedule or manage scheduling actions',
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
    const { action, dates, seasonId, matchIds, refAssignments } = body;

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

    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    if (action === 'generate') {
      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return NextResponse.json({ error: 'dates array is required' }, { status: 400 });
      }

      const result = await generateSeasonSchedule({
        seasonId,
        dates,
        gamesPerTeam: Number(body.gamesPerTeam) || undefined,
        maxGamesPerDay: Number(body.maxGamesPerDay) || undefined,
        replaceExisting: body.replaceExisting !== false,
      });

      return NextResponse.json({
        success: true,
        generatedMatches: result.matches.length,
        conflicts: result.conflicts,
        qualityViolations: result.qualityViolations,
        matches: result.matches,
        stats: result.stats,
        seasonId: result.seasonId,
        seasonName: result.seasonName,
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
      const { matchId, scheduledAt, fieldId, refId, status } = body;
      if (!matchId) {
        return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          fieldId,
          refId,
          status,
        },
      });
      return NextResponse.json({ success: true, match: updated });
    }

    if (action === 'create-special') {
      const { homeTeamId, awayTeamId, fieldId, date, time, seasonId: specialSeasonId } = body;

      if (!homeTeamId || !awayTeamId || !fieldId || !date) {
        return NextResponse.json({ error: 'homeTeamId, awayTeamId, fieldId, and date are required' }, { status: 400 });
      }

      const targetSeasonId = typeof specialSeasonId === 'string' ? specialSeasonId : null;
      if (!targetSeasonId) {
        return NextResponse.json({ error: 'seasonId is required for special matches' }, { status: 400 });
      }

      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = String(time || '10:00').split(':').map(Number);
      const scheduledAt = new Date(Date.UTC(year, month - 1, day, hours, minutes));

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Need at least') || message.includes('No active season') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await getAdminActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

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
