'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SubRequest {
  id: string;
  matchId: string;
  playerId: string;
  status: string;
  createdAt: string;
}

const matchInfo: Record<string, { home: string; away: string; date: string }> = {
  'match-1': { home: 'FC United', away: 'City Kickers', date: 'Mar 15, 10:00 AM' },
  'match-2': { home: 'Riverside FC', away: 'FC United', date: 'Mar 15, 12:00 PM' },
};

export default function SubsPage() {
  const [subs, setSubs] = useState<SubRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subs')
      .then(res => res.json())
      .then(data => setSubs(data))
      .finally(() => setLoading(false));
  }, []);

  const claimSub = async (subId: string) => {
    await fetch('/api/subs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: subId, status: 'CLAIMED' })
    });
    setSubs(subs.map(s => s.id === subId ? { ...s, status: 'CLAIMED' } : s));
  };

  if (loading) return <div className="min-h-screen p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen">
      <header className="glass-nav py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-cyan-400">League OS</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-white">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Sub Requests</h1>

        <div className="space-y-4">
          {subs.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/50">No sub requests available</p>
            </div>
          ) : (
            subs.map(sub => (
              <div key={sub.id} className="glass-card p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {matchInfo[sub.matchId]?.home || 'Team'} vs {matchInfo[sub.matchId]?.away || 'Opponent'}
                    </h3>
                    <p className="text-white/50">{matchInfo[sub.matchId]?.date || sub.matchId}</p>
                    <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                      sub.status === 'OPEN' ? 'bg-green-500/20 text-green-400' :
                      sub.status === 'CLAIMED' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.status === 'OPEN' && (
                    <button 
                      onClick={() => claimSub(sub.id)}
                      className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium"
                    >
                      Claim Sub
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 p-6 glass-card">
          <h3 className="text-xl font-bold text-white mb-4">Request a Sub</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Select Match</label>
              <select className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white">
                <option>FC United vs City Kickers - Mar 15</option>
                <option>Riverside FC vs FC United - Mar 15</option>
              </select>
            </div>
            <button type="submit" className="px-6 py-2 bg-cyan-500 text-black rounded-lg font-medium">
              Submit Request
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
