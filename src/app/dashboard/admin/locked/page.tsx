'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Search, RefreshCw } from 'lucide-react';

interface LockedUser {
  id: string;
  fullName: string;
  email: string;
  lockReason: string;
  unpaidAmount: number;
  createdAt: string;
}

export default function LockedUsersPage() {
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  const fetchLockedUsers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('league_user') || '{}');
      const res = await fetch('/api/admin/locked-users', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setLockedUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch locked users:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLockedUsers();
  }, []);

  const releaseUser = async (userId: string) => {
    setReleasing(userId);
    try {
      const adminUser = JSON.parse(localStorage.getItem('league_user') || '{}');
      const res = await fetch('/api/admin/release-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': adminUser.id 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setLockedUsers(lockedUsers.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to release user:', err);
    }
    setReleasing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00F5FF]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="text-red-400" />
            Locked Players
          </h1>
          <p className="text-secondary">Review and release locked player accounts</p>
        </div>
        <button onClick={fetchLockedUsers} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {lockedUsers.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Unlock size={48} className="mx-auto mb-4 text-green-400" />
          <p className="text-lg font-semibold">No Locked Players</p>
          <p className="text-secondary">All player accounts are currently active</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lockedUsers.map(user => (
            <div key={user.id} className="glass-card p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 font-bold text-xl">
                      {user.fullName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.fullName}</h3>
                    <p className="text-sm text-secondary">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AlertCircle size={14} className="text-red-400" />
                      <span className="text-sm text-red-400">{user.lockReason}</span>
                      {user.unpaidAmount > 0 && (
                        <span className="text-sm font-bold text-red-400">
                          ${user.unpaidAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => releaseUser(user.id)}
                  disabled={releasing === user.id}
                  className="btn-primary bg-green-600 hover:bg-green-500 flex items-center gap-2"
                >
                  {releasing === user.id ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Unlock size={16} />
                  )}
                  Release
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
