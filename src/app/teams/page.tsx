'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  captainId: string;
  primaryColor: string;
  secondaryColor: string;
  escrowTarget: number;
  currentBalance: number;
  isConfirmed: boolean;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Teams</h1>
          <Link
            href="/dashboard/teams/create"
            className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium"
            data-testid="teams-page-create-link"
          >
            + Create Team
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div key={team.id} className="glass-card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                >
                  {team.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${team.isConfirmed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {team.isConfirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Escrow Target</span>
                  <span className="text-white">${team.escrowTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Current Balance</span>
                  <span className="text-green-400">${team.currentBalance}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="block w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-center"
                  data-testid={`teams-page-roster-link-${team.id}`}
                >
                  View Roster
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
