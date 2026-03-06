import { NextRequest, NextResponse } from 'next/server';

// Chat API - stores messages in memory for demo
// In production: Socket.io + Redis for real-time, PostgreSQL for persistence

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

// Room types per PRD
const roomTypes = ['global', 'division', 'team', '1-1'];

// In-memory storage (replace with database in production)
const messages: Map<string, ChatMessage[]> = new Map();

// Initialize some demo messages
function initDemoMessages() {
  const globalRoom: ChatMessage[] = [
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
  ];
  
  messages.set('global', globalRoom);
}

initDemoMessages();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') || 'global';
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const roomMessages = messages.get(roomId) || [];
  const recentMessages = roomMessages.slice(-limit);
  
  return NextResponse.json({ 
    messages: recentMessages, 
    roomId,
    roomTypes,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId = 'global', userId, userName, userRole = 'PLAYER', message } = body;
    
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message are required' }, 
        { status: 400 }
      );
    }
    
    // Validate room
    if (!roomTypes.includes(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room type' }, 
        { status: 400 }
      );
    }
    
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      roomId,
      userId,
      userName: userName || 'Anonymous',
      userRole,
      message,
      timestamp: new Date().toISOString(),
    };
    
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    messages.get(roomId)!.push(chatMessage);
    
    // In production, emit via Socket.io here:
    // io.to(roomId).emit('newMessage', chatMessage);
    
    return NextResponse.json(chatMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, action, userId, reason } = body;
    
    if (!messageId || !action) {
      return NextResponse.json(
        { error: 'messageId and action are required' }, 
        { status: 400 }
      );
    }
    
    // Handle moderation actions per PRD
    for (const [roomId, roomMessages] of messages.entries()) {
      const idx = roomMessages.findIndex(m => m.id === messageId);
      if (idx >= 0) {
        const msg = roomMessages[idx];
        
        if (action === 'delete') {
          // Only message author or admin can delete
          if (msg.userId !== userId && !['ADMIN', 'MODERATOR'].includes(msg.userRole)) {
            return NextResponse.json(
              { error: 'Unauthorized to delete this message' }, 
              { status: 403 }
            );
          }
          roomMessages.splice(idx, 1);
        } else if (action === 'report') {
          msg.isReported = true;
          // In production: notify admins
        } else if (action === 'mute') {
          // In production: add user to mute list
          return NextResponse.json({
            success: true,
            message: 'User muted',
            mutedUserId: msg.userId,
          });
        }
        
        return NextResponse.json({ 
          success: true, 
          action,
          messageId,
        });
      }
    }
    
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Rooms endpoint
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'list-rooms') {
    const rooms = roomTypes.map(type => ({
      id: type,
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
      messageCount: messages.get(type)?.length || 0,
    }));
    
    return NextResponse.json({ rooms });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
