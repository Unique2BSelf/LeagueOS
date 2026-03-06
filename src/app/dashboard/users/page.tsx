'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Filter, UserPlus, Trash2, Edit, Eye, 
  Users, Shield, Crown, User, Gavel,
  Loader2, ChevronLeft, ChevronRight, Check, X
} from 'lucide-react';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  photoUrl?: string;
  isInsured: boolean;
  insuranceExpiry?: string;
  eloRating: number;
  isGoalie: boolean;
  isActive: boolean;
  hideFromDirectory: boolean;
  createdAt: string;
  teams: {
    teamId: string;
    teamName: string;
    status: string;
  }[];
}

interface Stats {
  total: number;
  admins: number;
  captains: number;
  players: number;
  refs: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Team {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  REF: 'Referee',
  CAPTAIN: 'Captain',
  PLAYER: 'Player',
  SPONSOR: 'Sponsor',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400',
  MODERATOR: 'bg-orange-500/20 text-orange-400',
  REF: 'bg-blue-500/20 text-blue-400',
  CAPTAIN: 'bg-yellow-500/20 text-yellow-400',
  PLAYER: 'bg-green-500/20 text-green-400',
  SPONSOR: 'bg-purple-500/20 text-purple-400',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, admins: 0, captains: 0, players: 0, refs: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [pagination.page, search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set('search', search);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      
      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;
    
    try {
      const promises = selectedUsers.map(id => 
        fetch(`/api/users/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setSelectedUsers([]);
      setShowBulkModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete users:', error);
    }
  };

  const handleBulkChangeRole = async () => {
    if (!newRole) return;
    
    try {
      const promises = selectedUsers.map(id => 
        fetch(`/api/users/${id}`, { 
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        })
      );
      await Promise.all(promises);
      setSelectedUsers([]);
      setShowBulkModal(false);
      setNewRole('');
      fetchUsers();
    } catch (error) {
      console.error('Failed to change roles:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">👥 User Management</h1>
            <p className="text-white/50 text-sm">Manage league users, roles, and permissions</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-white/50 text-sm">Total Users</div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <div className="text-white/50 text-sm">Admins</div>
                  <div className="text-2xl font-bold text-white">{stats.admins}</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-white/50 text-sm">Captains</div>
                  <div className="text-2xl font-bold text-white">{stats.captains}</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <User className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-white/50 text-sm">Players</div>
                  <div className="text-2xl font-bold text-white">{stats.players}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>
            </form>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins</option>
              <option value="CAPTAIN">Captains</option>
              <option value="PLAYER">Players</option>
              <option value="REF">Referees</option>
              <option value="MODERATOR">Moderators</option>
              <option value="SPONSOR">Sponsors</option>
            </select>
          </div>
        </section>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 p-4 bg-purple-500/20 rounded-lg flex items-center justify-between">
            <span className="text-white">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Change Role
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/20"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Team</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Insurance</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Joined</th>
                  <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-white/50">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-white/20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            {user.photoUrl ? (
                              <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <span className="text-purple-400 text-sm font-medium">
                                {user.fullName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-white font-medium">{user.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${ROLE_COLORS[user.role] || 'bg-gray-500/20 text-gray-400'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {user.teams.length > 0 ? (
                          <span className="text-white">{user.teams[0].teamName}</span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.isInsured ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Check className="w-4 h-4" /> Insured
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-400 text-sm">
                            <X className="w-4 h-4" /> None
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/users/${user.id}`}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-white/70 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-white/50 text-sm">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Bulk Action Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Bulk Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 mb-2">Change Role To:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select a role...</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="REF">Referee</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="PLAYER">Player</option>
                    <option value="SPONSOR">Sponsor</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleBulkChangeRole}
                    disabled={!newRole}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg"
                  >
                    Apply Role Change
                  </button>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
