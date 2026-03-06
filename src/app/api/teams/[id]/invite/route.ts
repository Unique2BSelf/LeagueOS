import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Generate invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/teams/[id]/invite - Get current invite code for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        division: true,
        season: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is captain or admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (team.captainId !== userId && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if invite code is valid
    const isValid = team.inviteCode && team.inviteCodeExpiry && team.inviteCodeExpiry > new Date();

    return NextResponse.json({
      inviteCode: team.inviteCode,
      expiresAt: team.inviteCodeExpiry,
      isValid,
    });
  } catch (error) {
    console.error('Error getting invite code:', error);
    return NextResponse.json({ error: 'Failed to get invite code' }, { status: 500 });
  }
}

// POST /api/teams/[id]/invite - Generate new invite code for a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Captain or Admin only' }, { status: 403 });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user is captain of this team (or admin)
    if (team.captainId !== userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not your team' }, { status: 403 });
    }

    // Generate new invite code
    const inviteCode = generateInviteCode();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days

    const updatedTeam = await prisma.team.update({
      where: { id },
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

// DELETE /api/teams/[id]/invite - Revoke invite code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'CAPTAIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Captain or Admin only' }, { status: 403 });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user is captain of this team (or admin)
    if (team.captainId !== userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not your team' }, { status: 403 });
    }

    // Clear invite code
    await prisma.team.update({
      where: { id },
      data: {
        inviteCode: null,
        inviteCodeExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invite code:', error);
    return NextResponse.json({ error: 'Failed to revoke invite code' }, { status: 500 });
  }
}
