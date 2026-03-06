'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Trash2, Loader2, Shield, Users, 
  Calendar, CreditCard, FileText, Clock, Check, X,
  User as UserIcon, Mail, Phone, Activity
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  photoUrl?: string;
  isInsured: boolean;
  insuranceExpiry?: string;
  eloRating: number;
  isGoalie: boolean;
  skillSpeed: number;
  skillTechnical: number;
  skillStamina: number;
  skillTeamwork: number;
  skillDefense: number;
  skillAttack: number;
  isFreeAgent: boolean;
  isActive: boolean;
  hideFromDirectory: boolean;
  createdAt: string;
  teams: {
    teamId: string;
    teamName: string;
    division: string;
    season: string;
    status: string;
    joinedAt: string;
  }[];
  registrations: {
    id: string;
    seasonId: string;
    seasonName: string;
    status: string;
    paid: boolean;
    amount: number;
    insuranceStatus: string;
    createdAt: string;
  }[];
  insurancePolicies: {
    id: string;
    provider: string;
    policyNumber?: string;
    startDate: string;
    endDate: string;
    cost: number;
    status: string;
  }[];
  payments: {
    id: string;
    amount: number;
    type: string;
    status: string;
    description?: string;
    year: number;
    createdAt: string;
  }[];
  backgroundChecks: {
    id: string;
    provider: string;
    status: string;
    resultUrl?: string;
    expiresAt?: string;
    createdAt: string;
  }[];
  stats: {
    totalTeams: number;
    totalRegistrations: number;
    totalTransactions: number;
    totalDisciplinary: number;
  };
  activityLog: {
    type: string;
    date: string;
    description: string;
  }[];
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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    teamId: '',
    isInsured: false,
    isActive: true,
    hideFromDirectory: false,
  });

  useEffect(() => {
    fetchUser();
    fetchTeams();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || '',
          role: data.role,
          teamId: data.teams[0]?.teamId || '',
          isInsured: data.isInsured,
          isActive: data.isActive,
          hideFromDirectory: data.hideFromDirectory,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          teamId: formData.teamId || null,
          isInsured: formData.isInsured,
          isActive: formData.isActive,
          hideFromDirectory: formData.hideFromDirectory,
        }),
      });
      
      if (res.ok) {
        fetchUser();
        alert('User updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/users/${userId}?hard=${deleteMode === 'hard'}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/dashboard/users');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">User not found</p>
          <Link href="/dashboard/users" className="text-purple-400 hover:underline">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: 'Details', icon: UserIcon },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'registrations', label: 'Registrations', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/users" 
                className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-purple-400 text-xl font-medium">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
                  <p className="text-white/50 text-sm flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {user.email}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-sm">Teams</div>
              <div className="text-2xl font-bold text-white">{user.stats.totalTeams}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-sm">Registrations</div>
              <div className="text-2xl font-bold text-white">{user.stats.totalRegistrations}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-sm">Transactions</div>
              <div className="text-2xl font-bold text-white">{user.stats.totalTransactions}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-sm">ELO Rating</div>
              <div className="text-2xl font-bold text-white">{user.eloRating}</div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Personal Information</h3>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="PLAYER">Player</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="REF">Referee</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SPONSOR">Sponsor</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Status & Settings</h3>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Team Assignment</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData(f => ({ ...f, teamId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">No Team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white font-medium">Insurance Status</div>
                    <div className="text-white/50 text-sm">
                      {user.isInsured ? `Valid until ${new Date(user.insuranceExpiry || '').toLocaleDateString()}` : 'Not insured'}
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData(f => ({ ...f, isInsured: !f.isInsured }))}
                    className={`px-4 py-2 rounded-lg ${
                      formData.isInsured
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {formData.isInsured ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white font-medium">Account Active</div>
                    <div className="text-white/50 text-sm">User can log in and participate</div>
                  </div>
                  <button
                    onClick={() => setFormData(f => ({ ...f, isActive: !f.isActive }))}
                    className={`px-4 py-2 rounded-lg ${
                      formData.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {formData.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white font-medium">Hide from Directory</div>
                    <div className="text-white/50 text-sm">User won't appear in public listings</div>
                  </div>
                  <button
                    onClick={() => setFormData(f => ({ ...f, hideFromDirectory: !f.hideFromDirectory }))}
                    className={`px-4 py-2 rounded-lg ${
                      formData.hideFromDirectory
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {formData.hideFromDirectory ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>

                {/* Skill Matrix */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white font-medium mb-3">Skill Matrix</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['Speed', 'Technical', 'Stamina', 'Teamwork', 'Defense', 'Attack'].map((skill) => {
                      const key = `skill${skill}` as keyof typeof user;
                      const value = user[key as keyof typeof user] as number;
                      return (
                        <div key={skill} className="text-center">
                          <div className="text-white/50 text-xs">{skill}</div>
                          <div className="text-white font-bold">{value}/5</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Team Memberships</h3>
              {user.teams.length === 0 ? (
                <p className="text-white/50 text-center py-8">No team memberships</p>
              ) : (
                <div className="space-y-3">
                  {user.teams.map((team) => (
                    <div key={team.teamId} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{team.teamName}</div>
                        <div className="text-white/50 text-sm">{team.division} • {team.season}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          team.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                          team.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {team.status}
                        </span>
                        <span className="text-white/50 text-xs">
                          Joined {new Date(team.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'registrations' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Registration History</h3>
              {user.registrations.length === 0 ? (
                <p className="text-white/50 text-center py-8">No registrations</p>
              ) : (
                <div className="space-y-3">
                  {user.registrations.map((reg) => (
                    <div key={reg.id} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">{reg.seasonName}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            reg.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                            reg.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {reg.status}
                          </span>
                          {reg.paid && (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              Paid
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span>${reg.amount}</span>
                        <span>Insurance: {reg.insuranceStatus}</span>
                        <span>{new Date(reg.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Insurance Policies */}
              <h3 className="text-lg font-bold text-white mt-8 mb-4">Insurance Policies</h3>
              {user.insurancePolicies.length === 0 ? (
                <p className="text-white/50 text-center py-8">No insurance policies</p>
              ) : (
                <div className="space-y-3">
                  {user.insurancePolicies.map((policy) => (
                    <div key={policy.id} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">{policy.provider}</div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          policy.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {policy.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span>${policy.cost}</span>
                        <span>{new Date(policy.startDate).toLocaleDateString()} - {new Date(policy.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Payment History</h3>
              {user.payments.length === 0 ? (
                <p className="text-white/50 text-center py-8">No transactions</p>
              ) : (
                <div className="space-y-3">
                  {user.payments.map((payment) => (
                    <div key={payment.id} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{payment.type}</div>
                        <div className="text-white/50 text-sm">{payment.description || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${payment.amount.toFixed(2)}</div>
                        <div className="text-white/50 text-xs">
                          {payment.status} • {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Activity Log</h3>
              {user.activityLog.length === 0 ? (
                <p className="text-white/50 text-center py-8">No activity</p>
              ) : (
                <div className="space-y-3">
                  {user.activityLog.map((activity, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'created' ? 'bg-green-500/20' :
                        activity.type === 'registration' ? 'bg-purple-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        <Activity className="w-4 h-4 text-white/70" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white">{activity.description}</div>
                        <div className="text-white/50 text-xs">
                          {new Date(activity.date).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Background Check Section */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Background Check
          </h3>
          {user.backgroundChecks.length === 0 ? (
            <p className="text-white/50">No background check on record</p>
          ) : (
            <div className="space-y-3">
              {user.backgroundChecks.map((check) => (
                <div key={check.id} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{check.provider}</div>
                    <div className="text-white/50 text-sm">
                      {check.expiresAt && `Expires: ${new Date(check.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    check.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                    check.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="mt-6 text-center text-white/30 text-sm">
          Account created: {new Date(user.createdAt).toLocaleString()}
        </div>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Delete User</h3>
            <p className="text-white/70 mb-4">Choose how to delete this user:</p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setDeleteMode('soft')}
                className={`w-full p-4 rounded-lg border text-left ${
                  deleteMode === 'soft'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10'
                }`}
              >
                <div className="text-white font-medium">Soft Delete</div>
                <div className="text-white/50 text-sm">Mark account as inactive (recoverable)</div>
              </button>
              
              <button
                onClick={() => setDeleteMode('hard')}
                className={`w-full p-4 rounded-lg border text-left ${
                  deleteMode === 'hard'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/10'
                }`}
              >
                <div className="text-white font-medium">Hard Delete</div>
                <div className="text-white/50 text-sm">Permanently remove user and all data</div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
