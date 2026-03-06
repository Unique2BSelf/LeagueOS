'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getStoredUser } from '@/lib/client-auth';

interface Message {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
}

const defaultChannels = [
  { id: 'global', name: 'General' },
  { id: 'division-premier', name: 'Premier Division' },
  { id: 'team-fc-united', name: 'FC United' },
  { id: 'direct-captains', name: 'Captains' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomId, setRoomId] = useState('global');
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState({ id: 'guest', name: 'Guest', role: 'PLAYER' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser?.id) {
      setUser({
        id: storedUser.id,
        name: storedUser.fullName || storedUser.email || 'User',
        role: storedUser.role || 'PLAYER',
      });
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const res = await fetch(`/api/chat?roomId=${encodeURIComponent(roomId)}`);
    const data = await res.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        message: newMessage,
      }),
    });

    setNewMessage('');
    loadMessages();
  };

  return (
    <div className="min-h-screen">
      <header className="glass-nav py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-cyan-400">League OS</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-white">Dashboard</Link>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="w-64 bg-black/20 border-r border-white/10 p-4">
          <h3 className="text-white font-bold mb-4">Channels</h3>
          <div className="space-y-2">
            {defaultChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setRoomId(channel.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  roomId === channel.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.userId === user.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-cyan-400">{message.userName.charAt(0).toUpperCase()}</span>
                </div>
                <div className={`max-w-md ${message.userId === user.id ? 'text-right' : ''}`}>
                  <div className="text-white/50 text-xs mb-1">{message.userName}</div>
                  <div className={`px-4 py-2 rounded-lg ${message.userId === user.id ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30"
              />
              <button type="submit" className="px-6 py-2 bg-cyan-500 text-black rounded-lg font-medium">
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

