'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, Download, Loader2, CheckSquare, Square, 
  AlertTriangle, CheckCircle, XCircle, Users
} from 'lucide-react';

interface Player {
  id: string;
  fullName: string;
  email: string;
  isInsured: boolean;
  insuranceExpiry: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  policy: {
    id: string;
    provider: string;
    policyNumber: string | null;
    startDate: string;
    endDate: string;
    cost: number;
  } | null;
}

interface Stats {
  totalPlayers: number;
  insuredCount: number;
  insuredPercent: number;
  expiringSoonCount: number;
  expiredCount: number;
}

type FilterTab = 'all' | 'insured' | 'expiring' | 'expired';

export default function InsuranceDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    insuredCount: 0,
    insuredPercent: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    fetchPlayers();
  }, [filter]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/insurance/admin?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
      // Fallback mock data
      setPlayers([
        { id: '1', fullName: 'John Smith', email: 'john@example.com', isInsured: true, insuranceExpiry: '2026-06-15', daysUntilExpiry: 102, isExpiringSoon: false, isExpired: false, policy: { id: 'p1', provider: 'LEAGUE_PROVIDED', policyNumber: 'POL-001', startDate: '2025-06-15', endDate: '2026-06-15', cost: 50 } },
        { id: '2', fullName: 'Jane Doe', email: 'jane@example.com', isInsured: true, insuranceExpiry: '2026-03-20', daysUntilExpiry: 15, isExpiringSoon: true, isExpired: false, policy: { id: 'p2', provider: 'LEAGUE_PROVIDED', policyNumber: 'POL-002', startDate: '2025-03-20', endDate: '2026-03-20', cost: 50 } },
        { id: '3', fullName: 'Mike Johnson', email: 'mike@example.com', isInsured: false, insuranceExpiry: null, daysUntilExpiry: null, isExpiringSoon: false, isExpired: true, policy: null },
        { id: '4', fullName: 'Sarah Williams', email: 'sarah@example.com', isInsured: true, insuranceExpiry: '2025-12-01', daysUntilExpiry: -95, isExpiringSoon: false, isExpired: true, policy: { id: 'p3', provider: 'LEAGUE_PROVIDED', policyNumber: 'POL-003', startDate: '2024-12-01', endDate: '2025-12-01', cost: 50 } },
        { id: '5', fullName: 'Tom Brown', email: 'tom@example.com', isInsured: true, insuranceExpiry: '2027-01-01', daysUntilExpiry: 302, isExpiringSoon: false, isExpired: false, policy: { id: 'p4', provider: 'LEAGUE_PROVIDED', policyNumber: 'POL-004', startDate: '2026-01-01', endDate: '2027-01-01', cost: 50 } },
      ]);
      setStats({
        totalPlayers: 5,
        insuredCount: 3,
        insuredPercent: 60,
        expiringSoonCount: 1,
        expiredCount: 2,
      });
    }
    setLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === players.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(players.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const purchaseInsurance = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Purchase insurance for ${selectedIds.size} player(s) at $50 each?`)) return;

    setSaving(true);
    try {
      const res = await fetch('/api/insurance/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase_bulk',
          playerIds: Array.from(selectedIds),
          cost: 50.00,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully purchased insurance for ${data.results.filter((r: any) => r.success).length} players`);
        setSelectedIds(new Set());
        fetchPlayers();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to purchase insurance:', error);
      alert('Failed to purchase insurance');
    }
    setSaving(false);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Insurance Status', 'Expiry Date', 'Days Until Expiry', 'Provider', 'Policy Number'];
    const rows = players.map(p => [
      p.fullName,
      p.email,
      p.isInsured ? (p.isExpired ? 'Expired' : 'Active') : 'Not Insured',
      p.insuranceExpiry || 'N/A',
      p.daysUntilExpiry !== null ? p.daysUntilExpiry.toString() : 'N/A',
      p.policy?.provider || 'N/A',
      p.policy?.policyNumber || 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insurance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (player: Player) => {
    if (player.isExpired) {
      return <span className="badge badge-danger">Expired</span>;
    }
    if (player.isExpiringSoon) {
      return <span className="badge badge-warning">Expiring Soon</span>;
    }
    if (player.isInsured) {
      return <span className="badge badge-success">Insured</span>;
    }
    return <span className="badge badge-danger">Not Insured</span>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Insurance Management</h1>
            <p className="text-white/50">Manage player insurance policies</p>
          </div>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalPlayers}</div>
            <div className="text-white/50 text-sm">Total Players</div>
          </div>
          <div className="glass-card p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.insuredPercent}%</div>
            <div className="text-white/50 text-sm">Insured ({stats.insuredCount})</div>
          </div>
          <div className="glass-card p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.expiringSoonCount}</div>
            <div className="text-white/50 text-sm">Expiring Soon</div>
          </div>
          <div className="glass-card p-4 text-center">
            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.expiredCount}</div>
            <div className="text-white/50 text-sm">Expired</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'insured', 'expiring', 'expired'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'all' && ` (${stats.totalPlayers})`}
              {tab === 'insured' && ` (${stats.insuredCount})`}
              {tab === 'expiring' && ` (${stats.expiringSoonCount})`}
              {tab === 'expired' && ` (${stats.expiredCount})`}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-4 p-4 bg-white/5 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-white/70 hover:text-white"
            >
              {selectedIds.size === players.length && players.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-cyan-400" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Select All ({selectedIds.size} selected)
            </button>
          </div>
          <button
            onClick={purchaseInsurance}
            disabled={selectedIds.size === 0 || saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Purchase Insurance (${(selectedIds.size * 50).toFixed(2)})
          </button>
        </div>

        {/* Players Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No players found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/50 font-medium"></th>
                  <th className="text-left py-3 px-4 text-white/50 font-medium">Player</th>
                  <th className="text-left py-3 px-4 text-white/50 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-white/50 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-white/50 font-medium">Expiry Date</th>
                  <th className="text-left py-3 px-4 text-white/50 font-medium">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                      selectedIds.has(player.id) ? 'bg-cyan-500/10' : ''
                    }`}
                    onClick={() => toggleSelect(player.id)}
                  >
                    <td className="py-3 px-4">
                      {selectedIds.has(player.id) ? (
                        <CheckSquare className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Square className="w-5 h-5 text-white/30" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{player.fullName}</div>
                    </td>
                    <td className="py-3 px-4 text-white/70">{player.email}</td>
                    <td className="py-3 px-4">{getStatusBadge(player)}</td>
                    <td className="py-3 px-4 text-white/70">{formatDate(player.insuranceExpiry)}</td>
                    <td className="py-3 px-4">
                      {player.daysUntilExpiry !== null && (
                        <span className={player.daysUntilExpiry < 0 ? 'text-red-400' : player.daysUntilExpiry <= 30 ? 'text-yellow-400' : 'text-white/70'}>
                          {player.daysUntilExpiry < 0 ? `${Math.abs(player.daysUntilExpiry)} days ago` : `${player.daysUntilExpiry} days`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
