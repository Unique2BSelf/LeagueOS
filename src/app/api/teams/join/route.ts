import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const teamId = typeof body?.teamId === 'string' ? body.teamId : '';

    if (!teamId) {
      return NextResponse.json({ error: 'Team is required' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const existing = await prisma.teamPlayer.findFirst({
      where: {
        userId,
        teamId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'You already requested or joined this team' }, { status: 400 });
    }

    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        userId,
        teamId,
        status: 'PENDING',
      },
    });

    return NextResponse.json(teamPlayer, { status: 201 });
  } catch (error) {
    console.error('Error requesting team join:', error);
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}
