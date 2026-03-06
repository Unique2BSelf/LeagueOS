import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
  isDeleted?: boolean;
  isReported?: boolean;
}

const roomTypes = ['global', 'division', 'team', '1-1'];
const messages: Map<string, ChatMessage[]> = new Map();

function initDemoMessages() {
  if (messages.has('global')) {
    return;
  }

  messages.set('global', [
    {
      id: '1',
      roomId: 'global',
      userId: 'admin-1',
      userName: 'League Admin',
      userRole: 'ADMIN',
      message: 'Welcome to League OS Chat! Be respectful and have fun.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      roomId: 'global',
      userId: 'player-1',
      userName: 'John Player',
      userRole: 'PLAYER',
      message: 'Hey everyone! Ready for the weekend games?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
  ]);
}

initDemoMessages();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') || searchParams.get('channel') || 'global';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const roomMessages = messages.get(roomId) || [];

  return NextResponse.json({
    messages: roomMessages.slice(-limit),
    roomId,
    roomTypes,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomId = body.roomId || body.channel || 'global';
    const userId = body.userId;
    const userName = body.userName || 'Anonymous';
    const userRole = body.userRole || 'PLAYER';
    const message = body.message || body.content;

    if (!userId || !message) {
      return NextResponse.json({ error: 'userId and message are required' }, { status: 400 });
    }

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      roomId,
      userId,
      userName,
      userRole,
      message,
      timestamp: new Date().toISOString(),
    };

    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }

    messages.get(roomId)!.push(chatMessage);
    return NextResponse.json(chatMessage, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, action, userId, userRole } = body;

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId and action are required' }, { status: 400 });
    }

    for (const roomMessages of messages.values()) {
      const idx = roomMessages.findIndex((message) => message.id === messageId);
      if (idx < 0) {
        continue;
      }

      const existing = roomMessages[idx];
      const canModerate = existing.userId === userId || ['ADMIN', 'MODERATOR'].includes(userRole || '');

      if (action === 'delete') {
        if (!canModerate) {
          return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 });
        }
        roomMessages.splice(idx, 1);
      } else if (action === 'report') {
        existing.isReported = true;
      } else if (action === 'mute') {
        if (!['ADMIN', 'MODERATOR'].includes(userRole || '')) {
          return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }
        return NextResponse.json({ success: true, message: 'User muted', mutedUserId: existing.userId });
      }

      return NextResponse.json({ success: true, action, messageId });
    }

    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'list-rooms') {
    return NextResponse.json({
      rooms: Array.from(messages.keys()).map((roomId) => ({
        id: roomId,
        name: roomId,
        messageCount: messages.get(roomId)?.length || 0,
      })),
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

