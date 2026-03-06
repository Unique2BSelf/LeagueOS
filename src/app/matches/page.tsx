'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Match {
  id: string;
  scheduledAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  fieldId: string;
}

const teamNames: Record<string, string> = {
  'team-1': 'FC United',
  'team-2': 'City Kickers',
  'team-3': 'Riverside FC',
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    fetch('/api/matches')
      .then(res => res.json())
      .then(data => setMatches(data))
      .finally(() => setLoading(false));
  }, []);

  const updateScore = async (matchId: string, team: 'home' | 'away', delta: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    const newHomeScore = team === 'home' ? (match.homeScore || 0) + delta : match.homeScore;
    const newAwayScore = team === 'away' ? (match.awayScore || 0) + delta : match.awayScore;
    
    // Update locally
    setMatches(matches.map(m => 
      m.id === matchId 
        ? { ...m, homeScore: newHomeScore, awayScore: newAwayScore }
        : m
    ));
  };

  const startMatch = (match: Match) => {
    setMatches(matches.map(m => 
      m.id === match.id ? { ...m, status: 'LIVE' } : m
    ));
  };

  const endMatch = (match: Match) => {
    setMatches(matches.map(m => 
      m.id === match.id ? { ...m, status: 'FINAL' } : m
    ));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
        <h1 className="text-3xl font-bold text-white mb-8">Match Center</h1>

        {/* Live Match Controls */}
        <div className="grid gap-6">
          {matches.map(match => (
            <div key={match.id} className={`glass-card p-6 ${match.status === 'LIVE' ? 'border-2 border-green-500' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    match.status === 'LIVE' ? 'bg-red-500 text-white animate-pulse' :
                    match.status === 'FINAL' ? 'bg-gray-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {match.status}
                  </span>
                  <p className="text-white/50 text-sm mt-1">{formatDate(match.scheduledAt)}</p>
                </div>
                {match.status === 'SCHEDULED' && (
                  <button 
                    onClick={() => startMatch(match)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium"
                  >
                    Start Match
                  </button>
                )}
                {match.status === 'LIVE' && (
                  <button 
                    onClick={() => endMatch(match)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
                  >
                    End Match
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-white">{teamNames[match.homeTeamId]?.charAt(0) || 'H'}</span>
                  </div>
                  <h3 className="text-white font-bold">{teamNames[match.homeTeamId] || 'Home Team'}</h3>
                  {match.status === 'LIVE' && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button onClick={() => updateScore(match.id, 'home', -1)} className="w-8 h-8 bg-white/10 rounded hover:bg-white/20 text-white">-</button>
                      <span className="text-3xl font-bold text-white w-12">{match.homeScore || 0}</span>
                      <button onClick={() => updateScore(match.id, 'home', 1)} className="w-8 h-8 bg-white/10 rounded hover:bg-white/20 text-white">+</button>
                    </div>
                  )}
                </div>

                <div className="text-2xl font-bold text-white/30 px-8">VS</div>

                {/* Away Team */}
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-white">{teamNames[match.awayTeamId]?.charAt(0) || 'A'}</span>
                  </div>
                  <h3 className="text-white font-bold">{teamNames[match.awayTeamId] || 'Away Team'}</h3>
                  {match.status === 'LIVE' && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button onClick={() => updateScore(match.id, 'away', -1)} className="w-8 h-8 bg-white/10 rounded hover:bg-white/20 text-white">-</button>
                      <span className="text-3xl font-bold text-white w-12">{match.awayScore || 0}</span>
                      <button onClick={() => updateScore(match.id, 'away', 1)} className="w-8 h-8 bg-white/10 rounded hover:bg-white/20 text-white">+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
