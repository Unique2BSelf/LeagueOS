'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, Settings, Users, Trash2, Edit, Loader2, Check, X, FileText } from 'lucide-react'

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  isArchived: boolean
  scoringSystem: string
  minRosterSize: number
  maxRosterSize: number
  subQuota: number
  divisions: number
  teams: number
}

export default function SeasonsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    scoringSystem: 'TRADITIONAL',
    minRosterSize: '8',
    maxRosterSize: '16',
    subQuota: '10',
  })

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      if (userData.role !== 'ADMIN' && userData.role !== 'CAPTAIN') {
        // Redirect or show error
      }
      fetchSeasons()
    }
    setLoading(false)
  }, [])

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const data = await res.json();
        setSeasons(data);
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    }
    // Fallback to mock if API fails
    if (seasons.length === 0) {
      setSeasons([
        { id: 'season-1', name: 'Spring 2026', startDate: '2026-03-01', endDate: '2026-06-30', isArchived: false, scoringSystem: 'TRADITIONAL', minRosterSize: 8, maxRosterSize: 16, subQuota: 10, divisions: 3, teams: 12 },
        { id: 'season-2', name: 'Fall 2025', startDate: '2025-09-01', endDate: '2025-12-31', isArchived: true, scoringSystem: 'TRADITIONAL', minRosterSize: 8, maxRosterSize: 16, subQuota: 10, divisions: 3, teams: 10 },
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const newSeason = {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      scoringSystem: formData.scoringSystem,
      minRosterSize: parseInt(formData.minRosterSize),
      maxRosterSize: parseInt(formData.maxRosterSize),
      subQuota: parseInt(formData.subQuota),
    }

    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeason),
      })

      if (res.ok) {
        const created = await res.json()
        setSeasons([...seasons, { ...created, divisions: 0, teams: 0 }])
        setShowForm(false)
      }
    } catch (error) {
      console.error('Failed to create season:', error)
    }

    setSaving(false)
  }

  const archiveSeason = async (id: string) => {
    try {
      const res = await fetch('/api/seasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isArchived: true }),
      })
      if (res.ok) {
        setSeasons(seasons.map(s => s.id === id ? { ...s, isArchived: true } : s))
      }
    } catch (error) {
      console.error('Failed to archive season:', error)
    }
  }

  const deleteSeason = async (id: string) => {
    if (!confirm('Are you sure you want to delete this season?')) return
    try {
      const res = await fetch(`/api/seasons?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSeasons(seasons.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete season:', error)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to manage seasons</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const activeSeasons = seasons.filter(s => !s.isArchived)
  const archivedSeasons = seasons.filter(s => s.isArchived)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Season Management</h1>
            <p className="text-white/50">Create and manage league seasons</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Season
          </button>
        </div>

        {/* New Season Form */}
        {showForm && (
          <div className="glass-card p-4 mb-6 border-2 border-cyan-500/30">
            <h2 className="text-lg font-bold text-white mb-4">Create New Season</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 mb-1">Season Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., Spring 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/70 mb-1">Min Roster</label>
                  <input
                    type="number"
                    value={formData.minRosterSize}
                    onChange={(e) => setFormData({ ...formData, minRosterSize: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="5"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Max Roster</label>
                  <input
                    type="number"
                    value={formData.maxRosterSize}
                    onChange={(e) => setFormData({ ...formData, maxRosterSize: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="5"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Sub Quota</label>
                  <input
                    type="number"
                    value={formData.subQuota}
                    onChange={(e) => setFormData({ ...formData, subQuota: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create Season
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active Seasons */}
        <h2 className="text-lg font-bold text-white mb-3">Active Seasons</h2>
        <div className="space-y-3 mb-8">
          {activeSeasons.map((season) => (
            <div key={season.id} className="glass-card p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{season.name}</h3>
                    <p className="text-white/50 text-sm">
                      {season.startDate} - {season.endDate}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-white/40">
                      <span>{season.divisions} Divisions</span>
                      <span>{season.teams} Teams</span>
                      <span>Roster: {season.minRosterSize}-{season.maxRosterSize}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/seasons/${season.id}/registration`} className="p-2 hover:bg-white/10 rounded-lg" title="Registration Form">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </Link>
                  <Link href={`/dashboard/seasons/${season.id}`} className="p-2 hover:bg-white/10 rounded-lg">
                    <Settings className="w-5 h-5 text-white/50" />
                  </Link>
                  <button onClick={() => archiveSeason(season.id)} className="p-2 hover:bg-white/10 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {activeSeasons.length === 0 && (
            <p className="text-white/40 text-center py-4">No active seasons</p>
          )}
        </div>

        {/* Archived Seasons */}
        {archivedSeasons.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-white mb-3">Archived Seasons</h2>
            <div className="space-y-3">
              {archivedSeasons.map((season) => (
                <div key={season.id} className="glass-card p-4 border-l-4 border-gray-500 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{season.name}</h3>
                      <p className="text-white/40 text-sm">
                        {season.startDate} - {season.endDate}
                      </p>
                    </div>
                    <span className="text-xs text-white/40">Archived</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
