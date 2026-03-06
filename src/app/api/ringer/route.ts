import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Detect ringers - players playing on multiple teams in same season
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  
  // In a real app, this would query the database
  // For mock, return sample ringer alerts
  
  const ringerAlerts = [
    {
      id: 'alert-1',
      playerId: 'user-123',
      playerName: 'John Smith',
      playerEmail: 'john@email.com',
      teams: [
        { teamName: 'FC United', division: 'Premier', matchesPlayed: 8 },
        { teamName: 'City Kickers', division: 'Premier', matchesPlayed: 3 },
      ],
      riskLevel: 'HIGH',
      reason: 'Playing on 2+ teams in same division',
    },
    {
      id: 'alert-2',
      playerId: 'user-456',
      playerName: 'Mike Johnson',
      playerEmail: 'mike@email.com',
      teams: [
        { teamName: 'Riverside FC', division: 'Division 2', matchesPlayed: 10 },
        { teamName: 'Eastside United', division: 'Division 2', matchesPlayed: 2 },
      ],
      riskLevel: 'MEDIUM',
      reason: 'Appeared on roster for multiple teams',
    },
  ];
  
  return NextResponse.json(ringerAlerts);
}

// Mark a player as flagged for review
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { playerId, reason } = body;
  
  // In real app, save to database
  const alert = {
    id: 'alert-' + Date.now(),
    playerId,
    reason,
    flaggedAt: new Date().toISOString(),
    status: 'FLAGGED',
  };
  
  return NextResponse.json(alert, { status: 201 });
}

// Clear a ringer flag
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { alertId, resolution } = body;
  
  // In real app, update database
  return NextResponse.json({ 
    success: true, 
    alertId, 
    resolution,
    resolvedAt: new Date().toISOString(),
  });
}
