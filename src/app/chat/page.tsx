'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  channel: string;
  userId: string;
  content: string;
  createdAt: string;
}

const userNames: Record<string, string> = {
  'user-admin': 'Admin',
  'user-captain': 'Captain',
  'user-player': 'Player',
  'user-moderator': 'Moderator',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState('global');
  const [newMessage, setNewMessage] = useState('');
  const [user] = useState({ id: 'user-admin', name: 'Admin' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = () => {
    fetch(`/api/chat?channel=${channel}`)
      .then(res => res.json())
      .then(data => setMessages(data));
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, userId: user.id, content: newMessage })
    });

    setNewMessage('');
    loadMessages();
  };

  const channels = [
    { id: 'global', name: '🌍 General' },
    { id: 'team-1', name: '🔴 FC United' },
    { id: 'team-2', name: '🔵 City Kickers' },
    { id: 'team-3', name: '🟢 Riverside FC' },
  ];

  return (
    <div className="min-h-screen">
      <header className="glass-nav py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-cyan-400">League OS</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-white">Dashboard</Link>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Channel List */}
        <div className="w-64 bg-black/20 border-r border-white/10 p-4">
          <h3 className="text-white font-bold mb-4">Channels</h3>
          <div className="space-y-2">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  channel === ch.id 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {ch.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.userId === user.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-cyan-400">
                    {userNames[msg.userId]?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className={`max-w-md ${msg.userId === user.id ? 'text-right' : ''}`}>
                  <div className="text-white/50 text-xs mb-1">
                    {userNames[msg.userId] || 'User'}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    msg.userId === user.id 
                      ? 'bg-cyan-500 text-black' 
                      : 'bg-white/10 text-white'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30"
              />
              <button 
                type="submit"
                className="px-6 py-2 bg-cyan-500 text-black rounded-lg font-medium"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
