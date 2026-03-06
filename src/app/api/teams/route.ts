import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// In-memory team storage for demo - exported for admin route
export const teams = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'available') {
    // Return teams accepting players
    const availableTeams = Array.from(teams.values()).filter((t: any) => t.openSlots > 0);
    return NextResponse.json(availableTeams);
  }
  
  return NextResponse.json(Array.from(teams.values()));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, captainId, divisionId, primaryColor, secondaryColor, escrowTarget } = body;
  
  if (!name || !captainId) {
    return NextResponse.json({ error: 'Name and captain required' }, { status: 400 });
  }
  
  const teamId = 'team-' + Date.now();
  const inviteCode = teamId.slice(-6).toUpperCase();
  
  const team = { 
    id: teamId, 
    name, 
    captainId, 
    divisionId: divisionId || 'div-1', 
    primaryColor: primaryColor || '#FF0000', 
    secondaryColor: secondaryColor || '#FFFFFF', 
    escrowTarget: escrowTarget || 2000, 
    currentBalance: 0, 
    isConfirmed: false,
    subQuotaRemaining: 10,
    seasonId: 'season-1',
    inviteCode,
    players: [],
    openSlots: 12,
    createdAt: new Date().toISOString(),
  };
  
  teams.set(teamId, team);
  
  return NextResponse.json(team, { status: 201 });
}

// Generate invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
