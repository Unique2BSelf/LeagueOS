'use client';

import { useState, useEffect } from 'react';

interface RingerAlert {
  id: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  teams: { teamName: string; division: string; matchesPlayed: number }[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export default function RingersPage() {
  const [alerts, setAlerts] = useState<RingerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/ringer');
      const data = await res.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load ringer alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string, resolution: 'CLEARED' | 'SUSPENDED' | 'WARNED') => {
    try {
      await fetch('/api/ringer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolution }),
      });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const filteredAlerts = filter === 'ALL' 
    ? alerts 
    : alerts.filter(a => a.riskLevel === filter);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ringer alerts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">🚨 Ringer Detection</h1>
          <p className="text-white/50 text-sm">Players appearing on multiple teams</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Total Alerts</div>
              <div className="text-3xl font-bold text-white">{alerts.length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">High Risk</div>
              <div className="text-3xl font-bold text-red-400">{alerts.filter(a => a.riskLevel === 'HIGH').length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Medium Risk</div>
              <div className="text-3xl font-bold text-yellow-400">{alerts.filter(a => a.riskLevel === 'MEDIUM').length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Low Risk</div>
              <div className="text-3xl font-bold text-green-400">{alerts.filter(a => a.riskLevel === 'LOW').length}</div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6">
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === level 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {level === 'ALL' ? 'All Alerts' : `${level} Risk`}
              </button>
            ))}
          </div>
        </section>

        {/* Alerts List */}
        <section>
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div key={alert.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-white">{alert.playerName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRiskColor(alert.riskLevel)}`}>
                        {alert.riskLevel}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm">{alert.playerEmail}</p>
                  </div>
                  <button
                    onClick={() => handleResolve(alert.id, 'CLEARED')}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    ✓ Clear
                  </button>
                </div>

                <p className="text-white/70 mb-4">{alert.reason}</p>

                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-white/50 text-sm mb-3">Active on teams:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alert.teams.map((team, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                        <div>
                          <div className="text-white font-medium">{team.teamName}</div>
                          <div className="text-white/50 text-xs">{team.division}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">{team.matchesPlayed}</div>
                          <div className="text-white/50 text-xs">matches</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleResolve(alert.id, 'WARNED')}
                    className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 px-4 rounded-lg transition-colors"
                  >
                    ⚠️ Issue Warning
                  </button>
                  <button
                    onClick={() => handleResolve(alert.id, 'SUSPENDED')}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 px-4 rounded-lg transition-colors"
                  >
                    🚫 Suspend Player
                  </button>
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">No Ringer Alerts</h3>
                <p className="text-white/50">All players appear to be properly rostered</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
