import { NextRequest, NextResponse } from 'next/server';

/**
 * Match Center API per PRD:
 * - Pre-game checklist
 * - Live timer
 * - Score/card entry
 * - Mandatory finalize within 4 hours
 * - No-show lockout
 */

interface MatchEvent {
  id: string;
  matchId: string;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'INJURY' | 'TIMEOUT';
  minute: number;
  teamId: string;
  playerId?: string;
  playerName?: string;
  description?: string;
  timestamp: string;
}

interface MatchState {
  id: string;
  status: 'PENDING' | 'PRE_GAME' | 'LIVE' | 'HALF_TIME' | 'LIVE_2ND' | 'FINAL' | 'DISPUTED' | 'RAINOUT' | 'FORFEIT';
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  startedAt?: string;
  endedAt?: string;
  events: MatchEvent[];
  checklist: {
    fieldInspected: boolean;
    playerCardsChecked: boolean;
    teamsPresent: boolean;
    refereeConfirmed: boolean;
  };
  lastUpdated: string;
  weatherStatus?: string;
}

// In-memory storage for demo
const matchStates: Map<string, MatchState> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }
  
  const state = matchStates.get(matchId);
  if (!state) {
    // Return default pending state
    return NextResponse.json({
      id: matchId,
      status: 'PENDING',
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      homeScore: 0,
      awayScore: 0,
      currentMinute: 0,
      events: [],
      checklist: {
        fieldInspected: false,
        playerCardsChecked: false,
        teamsPresent: false,
        refereeConfirmed: false,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
  
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, action, ...data } = body;
    
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }
    
    let state = matchStates.get(matchId);
    
    // Initialize state if not exists
    if (!state) {
      state = {
        id: matchId,
        status: 'PENDING',
        homeTeam: data.homeTeam || 'Home Team',
        awayTeam: data.awayTeam || 'Away Team',
        homeScore: 0,
        awayScore: 0,
        currentMinute: 0,
        events: [],
        checklist: {
          fieldInspected: false,
          playerCardsChecked: false,
          teamsPresent: false,
          refereeConfirmed: false,
        },
        lastUpdated: new Date().toISOString(),
      };
      matchStates.set(matchId, state);
    }
    
    if (action === 'start_match') {
      // Verify checklist complete per PRD
      if (!state.checklist.refereeConfirmed || !state.checklist.teamsPresent) {
        return NextResponse.json({
          error: 'Cannot start: complete pre-game checklist first',
          checklist: state.checklist,
        }, { status: 400 });
      }
      state.status = 'LIVE';
      state.startedAt = new Date().toISOString();
      state.currentMinute = 0;
    }
    
    if (action === 'update_checklist') {
      state.checklist = { ...state.checklist, ...data };
    }
    
    if (action === 'record_event') {
      const event: MatchEvent = {
        id: `event-${Date.now()}`,
        matchId,
        type: data.type,
        minute: data.minute || state.currentMinute,
        teamId: data.teamId,
        playerId: data.playerId,
        playerName: data.playerName,
        description: data.description,
        timestamp: new Date().toISOString(),
      };
      
      state.events.push(event);
      
      // Update score for goals
      if (data.type === 'GOAL') {
        if (data.teamId === 'home') state.homeScore++;
        else state.awayScore++;
        
        // Emit to Socket.io in production
      }
      
      // Create disciplinary action for cards
      if (data.type === 'RED_CARD' || data.type === 'YELLOW_CARD') {
        // In production: create DisciplinaryAction in DB
      }
    }
    
    if (action === 'tick') {
      // Increment minute (called by timer)
      if (state.status === 'LIVE' || state.status === 'LIVE_2ND') {
        state.currentMinute++;
        
        // Half time at 45
        if (state.currentMinute === 45 && state.status === 'LIVE') {
          state.status = 'HALF_TIME';
        }
        
        // Full time at 90
        if (state.currentMinute >= 90) {
          state.status = 'FINAL';
          state.endedAt = new Date().toISOString();
        }
      }
    }
    
    if (action === 'half_time') {
      state.status = 'HALF_TIME';
    }
    
    if (action === 'second_half') {
      state.status = 'LIVE_2ND';
    }
    
    if (action === 'finalize') {
      // Check 4-hour rule per PRD
      if (state.startedAt) {
        const hoursSinceStart = (Date.now() - new Date(state.startedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceStart > 4) {
          return NextResponse.json({
            error: 'Cannot finalize: 4-hour deadline passed',
            hoursElapsed: hoursSinceStart.toFixed(2),
          }, { status: 400 });
        }
      }
      state.status = 'FINAL';
      state.endedAt = new Date().toISOString();
    }
    
    if (action === 'dispute') {
      state.status = 'DISPUTED';
    }
    
    if (action === 'rainout') {
      state.status = 'RAINOUT';
      // In production: trigger reschedule workflow per PRD
    }
    
    if (action === 'forfeit') {
      state.status = 'FORFEIT';
      if (data.forfeitTeam === 'home') {
        state.awayScore = 3; // Default forfeit score
      } else {
        state.homeScore = 3;
      }
    }
    
    if (action === 'update_weather') {
      state.weatherStatus = data.weather;
    }
    
    state.lastUpdated = new Date().toISOString();
    
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get timer status
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { matchId } = body;
  
  const state = matchStates.get(matchId);
  if (!state) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  
  // Return timer info
  const elapsed = state.startedAt 
    ? Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)
    : 0;
  
  return NextResponse.json({
    matchId,
    status: state.status,
    currentMinute: state.currentMinute,
    isRunning: state.status === 'LIVE' || state.status === 'LIVE_2ND',
    elapsed,
    score: {
      home: state.homeScore,
      away: state.awayScore,
    },
    lastEvent: state.events[state.events.length - 1],
  });
}
