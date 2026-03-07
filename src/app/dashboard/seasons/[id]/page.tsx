'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  minRosterSize: number
  maxRosterSize: number
  subQuota: number
  isArchived: boolean
}

type Division = {
  id: string
  name: string
  level: number
  seasonId: string
  seasonName: string
  teamCount: number
  playerCount: number
  minRosterSize: number
  maxRosterSize: number
}

export default function SeasonDetailPage() {
  const params = useParams()
  const seasonId = params.id as string
  const [season, setSeason] = useState<Season | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: '1',
  })

  const isEditing = useMemo(() => Boolean(editingDivisionId), [editingDivisionId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [seasonsRes, divisionsRes] = await Promise.all([
          fetch('/api/seasons'),
          fetch(`/api/divisions?seasonId=${seasonId}`),
        ])

        if (!seasonsRes.ok || !divisionsRes.ok) {
          throw new Error('Failed to load season details')
        }

        const seasonsData = await seasonsRes.json()
        const seasonData = (Array.isArray(seasonsData) ? seasonsData : []).find((candidate) => candidate.id === seasonId) || null
        const divisionsData = await divisionsRes.json()

        setSeason(seasonData)
        setDivisions(Array.isArray(divisionsData) ? divisionsData : [])
      } catch (err: any) {
        setError(err.message || 'Failed to load season details')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [seasonId])

  const resetForm = () => {
    setFormData({ name: '', level: '1' })
    setEditingDivisionId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/divisions', {
        method: editingDivisionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingDivisionId
            ? { id: editingDivisionId, name: formData.name, level: parseInt(formData.level, 10) }
            : { seasonId, name: formData.name, level: parseInt(formData.level, 10) },
        ),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to save division')
      }

      const refreshed = await fetch(`/api/divisions?seasonId=${seasonId}`)
      setDivisions(await refreshed.json())
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save division')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (division: Division) => {
    setEditingDivisionId(division.id)
    setFormData({
      name: division.name,
      level: String(division.level),
    })
  }

  const deleteDivision = async (divisionId: string) => {
    setError('')
    try {
      const res = await fetch(`/api/divisions?id=${divisionId}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to delete division')
      }

      setDivisions((current) => current.filter((division) => division.id !== divisionId))
      if (editingDivisionId === divisionId) {
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete division')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Season not found</h1>
          <Link href="/dashboard/seasons" className="mt-4 inline-block text-cyan-300 underline">
            Back to seasons
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/dashboard/seasons" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to seasons
        </Link>
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{season.name}</h1>
              <p className="text-white/50 mt-1">
                {new Date(season.startDate).toLocaleDateString()} -{' '}
                {season.endDate ? new Date(season.endDate).toLocaleDateString() : 'Open ended'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/40">Roster</div>
                <div className="mt-1 text-white font-semibold">
                  {season.minRosterSize}-{season.maxRosterSize}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/40">Sub Quota</div>
                <div className="mt-1 text-white font-semibold">{season.subQuota}</div>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/40">Divisions</div>
                <div className="mt-1 text-white font-semibold">{divisions.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            {isEditing ? <Pencil className="h-5 w-5 text-cyan-400" /> : <Plus className="h-5 w-5 text-cyan-400" />}
            <h2 className="text-xl font-bold text-white">{isEditing ? 'Edit Division' : 'Add Division'}</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">Division Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Premier"
                data-testid="division-name-input"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">Level</label>
              <input
                type="number"
                min="1"
                value={formData.level}
                onChange={(e) => setFormData((current) => ({ ...current, level: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                data-testid="division-level-input"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-50"
                data-testid="save-division-button"
              >
                {saving ? 'Saving...' : isEditing ? 'Update Division' : 'Create Division'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Divisions</h2>
          </div>

          {divisions.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
              No divisions exist for this season yet.
            </div>
          ) : (
            <div className="space-y-3">
              {divisions.map((division) => (
                <div key={division.id} className="rounded-lg border border-white/10 bg-white/5 p-4" data-testid={`division-card-${division.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{division.name}</h3>
                      <p className="mt-1 text-sm text-white/50">Level {division.level}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
                        <span>{division.teamCount} teams</span>
                        <span>{division.playerCount} rostered players</span>
                        <span>Roster target {division.minRosterSize}-{division.maxRosterSize}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(division)}
                        className="rounded-md bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                        data-testid={`edit-division-${division.id}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDivision(division.id)}
                        className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30"
                        data-testid={`delete-division-${division.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
