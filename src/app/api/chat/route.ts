import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'division' | 'team' | 'direct';
}

type ChatEvent =
  | { type: 'message_created'; roomId: string; message: Record<string, unknown> }
  | { type: 'message_deleted'; roomId: string; messageId: string };

const roomSubscribers = new Map<string, Set<(event: ChatEvent) => void>>();

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

function subscribeToRoom(roomId: string, listener: (event: ChatEvent) => void): () => void {
  const listeners = roomSubscribers.get(roomId) || new Set<(event: ChatEvent) => void>();
  listeners.add(listener);
  roomSubscribers.set(roomId, listeners);

  return () => {
    const current = roomSubscribers.get(roomId);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      roomSubscribers.delete(roomId);
    }
  };
}

function broadcastToRoom(roomId: string, event: ChatEvent) {
  const listeners = roomSubscribers.get(roomId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(event);
  }
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
    const stream = searchParams.get('stream') === '1';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    if (stream) {
      const encoder = new TextEncoder();
      let cleanup = () => {};
      let heartbeat: NodeJS.Timeout | null = null;

      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const write = (event: ChatEvent | { type: 'connected'; roomId: string }) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          };

          cleanup = subscribeToRoom(roomId, write);
          write({ type: 'connected', roomId });
          heartbeat = setInterval(() => {
            controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
          }, 15000);
        },
        cancel() {
          cleanup();
          if (heartbeat) {
            clearInterval(heartbeat);
          }
        },
      });

      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

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

    const payload = {
      id: created.id,
      roomId: created.channel,
      userId: created.userId,
      userName: created.user.fullName,
      userRole: created.user.role,
      message: created.content,
      timestamp: created.createdAt.toISOString(),
    };

    broadcastToRoom(roomId, {
      type: 'message_created',
      roomId,
      message: payload,
    });

    return NextResponse.json(payload, { status: 201 });
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

      broadcastToRoom(existing.channel, {
        type: 'message_deleted',
        roomId: existing.channel,
        messageId,
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
