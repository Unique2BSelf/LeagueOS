import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Generate invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// POST /api/teams/invite - Generate invite code for a team (captain only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Captain or Admin only' }, { status: 403 });
    }

    const { teamId } = await request.json();

    // Verify user is captain of this team
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.captainId !== userId) {
      return NextResponse.json({ error: 'Not your team' }, { status: 403 });
    }

    // Generate new invite code
    const inviteCode = generateInviteCode();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        inviteCode,
        inviteCodeExpiry: expiry,
      },
    });

    return NextResponse.json({
      inviteCode: updatedTeam.inviteCode,
      expiresAt: updatedTeam.inviteCodeExpiry,
    });
  } catch (error) {
    console.error('Error generating invite code:', error);
    return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 });
  }
}

// GET /api/teams/invite?code=XXXX - Validate invite code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    const team = await prisma.team.findFirst({
      where: {
        inviteCode: code.toUpperCase(),
        inviteCodeExpiry: { gt: new Date() },
      },
      include: {
        division: true,
        season: true,
      },
    });

    if (!team) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' });
    }

    return NextResponse.json({
      valid: true,
      team: {
        id: team.id,
        name: team.name,
        division: team.division?.name,
        season: team.season?.name,
      },
    });
  } catch (error) {
    console.error('Error validating invite code:', error);
    return NextResponse.json({ error: 'Failed to validate invite code' }, { status: 500 });
  }
}

// POST /api/teams/invite/join - Join team with invite code
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    const team = await prisma.team.findFirst({
      where: {
        inviteCode: inviteCode.toUpperCase(),
        inviteCodeExpiry: { gt: new Date() },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }

    // Check if already on team
    const existing = await prisma.teamPlayer.findFirst({
      where: {
        userId,
        teamId: team.id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already on this team' }, { status: 400 });
    }

    // Join team
    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        userId,
        teamId: team.id,
        status: 'APPROVED', // Auto-approve since they have invite code
      },
    });

    // Clear invite code after use
    await prisma.team.update({
      where: { id: team.id },
      data: {
        inviteCode: null,
        inviteCodeExpiry: null,
      },
    });

    return NextResponse.json({ success: true, teamId: team.id });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
