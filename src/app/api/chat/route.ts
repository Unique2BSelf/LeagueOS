import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'division' | 'team' | 'direct';
}

function titleizeRoom(channel: string): string {
  if (channel === 'global') {
    return 'General';
  }

  if (channel.startsWith('division-')) {
    return channel.replace('division-', '').replace(/-/g, ' ');
  }

  if (channel.startsWith('team-')) {
    return channel.replace('team-', '').replace(/-/g, ' ');
  }

  if (channel.startsWith('direct-')) {
    return 'Direct Message';
  }

  return channel;
}

async function getUserRooms(userId: string, userRole: string): Promise<ChatRoom[]> {
  const rooms = new Map<string, ChatRoom>();
  rooms.set('global', { id: 'global', name: 'General', type: 'global' });

  const memberships = await prisma.teamPlayer.findMany({
    where: {
      userId,
      status: 'APPROVED',
    },
    include: {
      team: {
        include: {
          division: true,
        },
      },
    },
  });

  for (const membership of memberships) {
    rooms.set(`team-${membership.team.id}`, {
      id: `team-${membership.team.id}`,
      name: membership.team.name,
      type: 'team',
    });

    if (membership.team.division) {
      rooms.set(`division-${membership.team.division.id}`, {
        id: `division-${membership.team.division.id}`,
        name: membership.team.division.name,
        type: 'division',
      });
    }
  }

  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    rooms.set('direct-captains', {
      id: 'direct-captains',
      name: 'Captains',
      type: 'direct',
    });
  }

  return Array.from(rooms.values());
}

function canAccessRoom(roomId: string, rooms: ChatRoom[]): boolean {
  return rooms.some((room) => room.id === roomId);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || 'PLAYER';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await getUserRooms(userId, userRole);
    const { searchParams } = new URL(request.url);
    const requestedRoomId = searchParams.get('roomId') || 'global';
    const roomId = canAccessRoom(requestedRoomId, rooms) ? requestedRoomId : 'global';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const messages = await prisma.message.findMany({
      where: {
        channel: roomId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      roomId,
      rooms,
      messages: messages.map((message) => ({
        id: message.id,
        roomId: message.channel,
        userId: message.userId,
        userName: message.user.fullName,
        userRole: message.user.role,
        message: message.content,
        timestamp: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || 'PLAYER';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await getUserRooms(userId, userRole);
    const body = await request.json();
    const roomId = typeof body?.roomId === 'string' ? body.roomId : 'global';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!canAccessRoom(roomId, rooms)) {
      return NextResponse.json({ error: 'Forbidden room' }, { status: 403 });
    }

    const created = await prisma.message.create({
      data: {
        channel: roomId,
        userId,
        content: message,
      },
      include: {
        user: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: created.id,
      roomId: created.channel,
      userId: created.userId,
      userName: created.user.fullName,
      userRole: created.user.role,
      message: created.content,
      timestamp: created.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || 'PLAYER';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const messageId = typeof body?.messageId === 'string' ? body.messageId : '';
    const action = typeof body?.action === 'string' ? body.action : '';

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId and action are required' }, { status: 400 });
    }

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const canModerate = existing.userId === userId || ['ADMIN', 'MODERATOR'].includes(userRole);
    if (action === 'delete') {
      if (!canModerate) {
        return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 });
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true },
      });

      return NextResponse.json({ success: true, action, messageId });
    }

    if (action === 'list-rooms') {
      const rooms = await getUserRooms(userId, userRole);
      return NextResponse.json({ rooms });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Chat PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || 'PLAYER';

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rooms = await getUserRooms(userId, userRole);
  return NextResponse.json({
    rooms: rooms.map((room) => ({
      ...room,
      label: room.name || titleizeRoom(room.id),
    })),
  });
}
