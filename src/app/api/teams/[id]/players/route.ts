import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const players = await prisma.teamPlayer.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching team players:', error);
    return NextResponse.json({ error: 'Failed to fetch team players' }, { status: 500 });
  }
}
