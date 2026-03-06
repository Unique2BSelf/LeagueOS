"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, Plus, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

export default function MatchCenterPage() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [yellowCards, setYellowCards] = useState({ home: 0, away: 0 });
  const [redCards, setRedCards] = useState({ home: 0, away: 0 });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetMatch = () => {
    setTime(0);
    setIsRunning(false);
    setHomeScore(0);
    setAwayScore(0);
    setYellowCards({ home: 0, away: 0 });
    setRedCards({ home: 0, away: 0 });
  };

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>
      <header className="glass-card border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/ref/jobs" className="text-cyan-400 hover:underline">
            ← Back to Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Match Center</h1>
          <p className="text-gray-400">Thunder FC vs Velocity SC • Premier Division</p>
          <p className="text-cyan-400">Field 1 • Today 10:00 AM</p>
        </div>

        {/* Match Timer */}
        <div className="glass-card p-8 text-center mb-6">
          <div className="text-6xl font-mono font-bold text-white mb-4">
            {formatTime(time)}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition"
              style={{ background: isRunning ? '#FF3B3B' : '#00F5FF', color: '#121212' }}
            >
              {isRunning ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Start</>}
            </button>
            <button
              onClick={resetMatch}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-white/10 text-white hover:bg-white/20 transition"
            >
              <RotateCcw className="w-5 h-5" /> Reset
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Thunder FC</h2>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setHomeScore(s => s - 1)} className="p-2 rounded bg-white/10 text-white hover:bg-white/20">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-5xl font-bold text-cyan-400">{homeScore}</span>
                <button onClick={() => setHomeScore(s => s + 1)} className="p-2 rounded bg-white/10 text-white hover:bg-white/20">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="text-4xl text-gray-500 px-8">-</div>
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Velocity SC</h2>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setAwayScore(s => s - 1)} className="p-2 rounded bg-white/10 text-white hover:bg-white/20">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-5xl font-bold text-cyan-400">{awayScore}</span>
                <button onClick={() => setAwayScore(s => s + 1)} className="p-2 rounded bg-white/10 text-white hover:bg-white/20">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4">Thunder FC Cards</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-2xl mb-1">{yellowCards.home}</div>
                <button 
                  onClick={() => setYellowCards(c => ({ ...c, home: c.home + 1 }))}
                  className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/30"
                >
                  + Yellow
                </button>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-2xl mb-1">{redCards.home}</div>
                <button 
                  onClick={() => setRedCards(c => ({ ...c, home: c.home + 1 }))}
                  className="px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                  + Red
                </button>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4">Velocity SC Cards</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-2xl mb-1">{yellowCards.away}</div>
                <button 
                  onClick={() => setYellowCards(c => ({ ...c, away: c.away + 1 }))}
                  className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/30"
                >
                  + Yellow
                </button>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-2xl mb-1">{redCards.away}</div>
                <button 
                  onClick={() => setRedCards(c => ({ ...c, away: c.away + 1 }))}
                  className="px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                  + Red
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="glass-card p-5 mb-6">
          <h3 className="text-white font-semibold mb-4">Pre-Match Checklist</h3>
          <div className="space-y-3">
            {['Check player IDs', 'Verify team rosters', 'Confirm field conditions', 'Check goal nets', 'Brief captains'].map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded accent-cyan-400" />
                <span className="text-gray-300">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button 
            className="flex-1 py-3 rounded-lg font-semibold transition hover:opacity-90"
            style={{ background: '#00F5FF', color: '#121212' }}
          >
            Submit Match Report
          </button>
        </div>
      </main>
    </div>
  );
}
