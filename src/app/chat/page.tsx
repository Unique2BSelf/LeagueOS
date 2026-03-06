'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'division' | 'team' | 'direct';
  label?: string;
}

export default function ChatPage() {
  const { user, loading: sessionLoading } = useSessionUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomId, setRoomId] = useState('global');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async (nextRoomId = roomId) => {
    const res = await fetch(`/api/chat?roomId=${encodeURIComponent(nextRoomId)}`, {
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load chat');
    }

    setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setRoomId(data.roomId || nextRoomId);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        if (!cancelled) {
          await loadMessages();
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load chat');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roomId,
          message: newMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessages((current) => [...current, data]);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-white">Please log in to use chat.</p>
          <Link href="/login?redirect=/chat" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="glass-nav px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-cyan-400">League OS</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-white">Dashboard</Link>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="w-64 border-r border-white/10 bg-black/20 p-4">
          <h3 className="mb-4 font-bold text-white">Rooms</h3>
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setRoomId(room.id)}
                className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${
                  roomId === room.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {room.label || room.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {error && (
            <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.userId === user.id ? 'flex-row-reverse' : ''}`}>
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs text-cyan-400">{message.userName.charAt(0).toUpperCase()}</span>
                </div>
                <div className={`max-w-md ${message.userId === user.id ? 'text-right' : ''}`}>
                  <div className="mb-1 text-xs text-white/50">{message.userName}</div>
                  <div className={`rounded-lg px-4 py-2 ${message.userId === user.id ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                    {message.message}
                  </div>
                  <div className="mt-1 text-[11px] text-white/30">{new Date(message.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white placeholder-white/30"
              />
              <button type="submit" disabled={sending || !newMessage.trim()} className="rounded-lg bg-cyan-500 px-5 py-2 font-medium text-black disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
