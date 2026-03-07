import { NextRequest, NextResponse } from 'next/server';
import { MatchStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

type MatchCenterStatus = 'PENDING' | 'PRE_GAME' | 'LIVE' | 'HALF_TIME' | 'LIVE_2ND' | 'FINAL' | 'DISPUTED' | 'RAINOUT' | 'FORFEIT';

function mapMatchStatus(status: MatchStatus, checklistDone: boolean): MatchCenterStatus {
  if (status === 'SCHEDULED' && !checklistDone) return 'PENDING';
  if (status === 'SCHEDULED' && checklistDone) return 'PRE_GAME';
  return status as MatchCenterStatus;
}

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });
}

async function serializeState(match: {
  id: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  currentMinute: number;
  startedAt: Date | null;
  endedAt: Date | null;
  weatherStatus: string | null;
  checklistDone: boolean;
  fieldInspected: boolean;
  playerCardsChecked: boolean;
  teamsPresent: boolean;
  refereeConfirmed: boolean;
  homeTeam: { name: string };
  awayTeam: { name: string };
  reportNotes: string | null;
  events: Array<{
    id: string;
    type: string;
    minute: number;
    teamId: string | null;
    playerId: string | null;
    playerName: string | null;
    description: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: match.id,
    status: mapMatchStatus(match.status, match.checklistDone),
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    currentMinute: match.currentMinute ?? 0,
    startedAt: match.startedAt?.toISOString(),
    endedAt: match.endedAt?.toISOString(),
    events: match.events.map((event) => ({
      id: event.id,
      matchId: match.id,
      type: event.type,
      minute: event.minute,
      teamId: event.teamId || undefined,
      playerId: event.playerId || undefined,
      playerName: event.playerName || undefined,
      description: event.description || undefined,
      timestamp: event.createdAt.toISOString(),
    })),
    checklist: {
      fieldInspected: match.fieldInspected,
      playerCardsChecked: match.playerCardsChecked,
      teamsPresent: match.teamsPresent,
      refereeConfirmed: match.refereeConfirmed,
    },
    lastUpdated: match.endedAt?.toISOString() || match.startedAt?.toISOString() || new Date().toISOString(),
    weatherStatus: match.weatherStatus || undefined,
    notes: match.reportNotes || '',
  };
}

async function loadMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  const match = await loadMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  return NextResponse.json(await serializeState(match));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const matchId = typeof body.matchId === 'string' ? body.matchId : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const session = await getSessionFromRequest(request);

    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }

    const match = await loadMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (action === 'start_match') {
      if (!match.refereeConfirmed || !match.teamsPresent) {
        return NextResponse.json({
          error: 'Cannot start: complete pre-game checklist first',
          checklist: {
            fieldInspected: match.fieldInspected,
            playerCardsChecked: match.playerCardsChecked,
            teamsPresent: match.teamsPresent,
            refereeConfirmed: match.refereeConfirmed,
          },
        }, { status: 400 });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'LIVE',
          startedAt: match.startedAt || new Date(),
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return NextResponse.json(await serializeState(updated));
    }

    if (action === 'update_checklist') {
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          fieldInspected: Boolean(body.fieldInspected),
          playerCardsChecked: Boolean(body.playerCardsChecked),
          teamsPresent: Boolean(body.teamsPresent),
          refereeConfirmed: Boolean(body.refereeConfirmed),
          checklistDone: [body.fieldInspected, body.playerCardsChecked, body.teamsPresent, body.refereeConfirmed].every(Boolean),
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return NextResponse.json(await serializeState(updated));
    }

    if (action === 'record_event') {
      const event = await prisma.matchEvent.create({
        data: {
          matchId,
          type: body.type,
          minute: Number(body.minute || match.currentMinute || 0),
          teamId: typeof body.teamId === 'string' ? body.teamId : null,
          playerId: typeof body.playerId === 'string' ? body.playerId : null,
          playerName: typeof body.playerName === 'string' ? body.playerName : null,
          description: typeof body.description === 'string' ? body.description : null,
        },
      });

      const updateData: Record<string, unknown> = {};
      if (body.type === 'GOAL') {
        if (body.teamId === match.homeTeamId) {
          updateData.homeScore = (match.homeScore ?? 0) + 1;
        } else if (body.teamId === match.awayTeamId) {
          updateData.awayScore = (match.awayScore ?? 0) + 1;
        }
      }

      if ((body.type === 'RED_CARD' || body.type === 'YELLOW_CARD') && body.playerId && session?.userId) {
        const actor = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, role: true },
        });

        if (actor && (actor.role === 'REF' || actor.role === 'ADMIN' || actor.role === 'MODERATOR')) {
          const disciplinaryCardType = body.cardType || (body.type === 'RED_CARD' ? 'RED' : 'YELLOW_2');
          const defaultFine = disciplinaryCardType === 'RED' ? 50 : 25;

          await prisma.disciplinaryAction.create({
            data: {
              userId: body.playerId,
              matchId,
              cardType: disciplinaryCardType,
              fineAmount: Number(body.fineAmount ?? defaultFine),
              suspensionGames: Number(body.suspensionGames ?? (disciplinaryCardType === 'RED' ? 1 : 0)),
              reportNotes: typeof body.description === 'string' ? body.description : null,
              source: 'MATCH_REPORT',
              reportedById: actor.id,
            },
          });
        }
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return NextResponse.json(await serializeState(updated));
    }

    if (action === 'tick') {
      const nextMinute = (match.currentMinute ?? 0) + 1;
      const nextStatus =
        nextMinute >= 90 ? 'FINAL' :
        nextMinute === 45 && match.status === 'LIVE' ? 'LIVE' :
        match.status;

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          currentMinute: nextMinute,
          status: nextMinute >= 90 ? 'FINAL' : match.status,
          endedAt: nextMinute >= 90 ? new Date() : match.endedAt,
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return NextResponse.json(await serializeState(updated));
    }

    if (action === 'half_time' || action === 'second_half' || action === 'dispute' || action === 'rainout' || action === 'forfeit' || action === 'update_weather' || action === 'finalize') {
      const updateData: Record<string, unknown> = {};

      if (action === 'half_time') {
        updateData.status = 'LIVE';
      }
      if (action === 'second_half') {
        updateData.status = 'LIVE';
      }
      if (action === 'dispute') {
        updateData.status = 'DISPUTED';
      }
      if (action === 'rainout') {
        updateData.status = 'RAINOUT';
      }
      if (action === 'forfeit') {
        updateData.status = 'FORFEIT';
        if (body.forfeitTeam === 'home') {
          updateData.awayScore = 3;
        } else {
          updateData.homeScore = 3;
        }
      }
      if (action === 'update_weather') {
        updateData.weatherStatus = typeof body.weather === 'string' ? body.weather : null;
      }
      if (action === 'finalize') {
        if (match.startedAt) {
          const hoursSinceStart = (Date.now() - match.startedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceStart > 4) {
            return NextResponse.json({
              error: 'Cannot finalize: 4-hour deadline passed',
              hoursElapsed: hoursSinceStart.toFixed(2),
            }, { status: 400 });
          }
        }
        updateData.status = 'FINAL';
        updateData.endedAt = new Date();
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return NextResponse.json(await serializeState(updated));
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Match center API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const matchId = typeof body.matchId === 'string' ? body.matchId : '';

  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  const match = await loadMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const isRunning = match.status === 'LIVE';
  const elapsed = match.startedAt ? Math.floor((Date.now() - match.startedAt.getTime()) / 1000) : 0;

  return NextResponse.json({
    matchId,
    status: mapMatchStatus(match.status, match.checklistDone),
    currentMinute: match.currentMinute,
    isRunning,
    elapsed,
    score: {
      home: match.homeScore ?? 0,
      away: match.awayScore ?? 0,
    },
    lastEvent: match.events[match.events.length - 1]
      ? {
          id: match.events[match.events.length - 1].id,
          type: match.events[match.events.length - 1].type,
          minute: match.events[match.events.length - 1].minute,
          teamId: match.events[match.events.length - 1].teamId,
          playerId: match.events[match.events.length - 1].playerId,
          playerName: match.events[match.events.length - 1].playerName,
          description: match.events[match.events.length - 1].description,
          timestamp: match.events[match.events.length - 1].createdAt.toISOString(),
        }
      : null,
  });
}
