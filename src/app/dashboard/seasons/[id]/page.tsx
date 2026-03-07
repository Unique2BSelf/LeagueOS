'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'

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

type Team = {
  id: string
  name: string
  captainId: string
  divisionId: string
  seasonId: string
  division?: { id: string; name: string }
  season?: { id: string; name: string }
  primaryColor: string
  secondaryColor: string
  approvalStatus: string
  isConfirmed: boolean
  players: Array<{ userId: string; status: string }>
}

export default function SeasonDetailPage() {
  const params = useParams()
  const seasonId = params.id as string
  const [season, setSeason] = useState<Season | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teamActionLoading, setTeamActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: '1',
  })

  const isEditing = useMemo(() => Boolean(editingDivisionId), [editingDivisionId])

  const loadSeason = async () => {
    setLoading(true)
    setError('')
    try {
      const [seasonsRes, divisionsRes, teamsRes] = await Promise.all([
        fetch('/api/seasons'),
        fetch(`/api/divisions?seasonId=${seasonId}`),
        fetch(`/api/admin/teams?seasonId=${seasonId}`),
      ])

      if (!seasonsRes.ok || !divisionsRes.ok || !teamsRes.ok) {
        throw new Error('Failed to load season details')
      }

      const seasonsData = await seasonsRes.json()
      const seasonData = (Array.isArray(seasonsData) ? seasonsData : []).find((candidate) => candidate.id === seasonId) || null
      const divisionsData = await divisionsRes.json()
      const teamsData = await teamsRes.json()

      setSeason(seasonData)
      setDivisions(Array.isArray(divisionsData) ? divisionsData : [])
      setTeams(Array.isArray(teamsData) ? teamsData : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load season details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSeason()
  }, [seasonId])

  const divisionTeams = useMemo(() => {
    const grouped = new Map<string, Team[]>()
    for (const team of teams) {
      const existing = grouped.get(team.divisionId) || []
      existing.push(team)
      grouped.set(team.divisionId, existing)
    }
    return grouped
  }, [teams])

  const resetForm = () => {
    setFormData({ name: '', level: '1' })
    setEditingDivisionId(null)
  }

  const handleDivisionSubmit = async (e: React.FormEvent) => {
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

      await loadSeason()
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

      await loadSeason()
      if (editingDivisionId === divisionId) {
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete division')
    }
  }

  const updateTeamApproval = async (teamId: string, action: 'APPROVE' | 'REJECT') => {
    setTeamActionLoading(`${action}-${teamId}`)
    setError('')
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: [teamId],
          action,
          rejectionReason: action === 'REJECT' ? 'Rejected from season team management' : undefined,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update team')
      }
      await loadSeason()
    } catch (err: any) {
      setError(err.message || 'Failed to update team')
    } finally {
      setTeamActionLoading(null)
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/dashboard/seasons" className="mb-4 inline-flex items-center gap-2 text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to seasons
        </Link>
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{season.name}</h1>
              <p className="mt-1 text-white/50">
                {new Date(season.startDate).toLocaleDateString()} -{' '}
                {season.endDate ? new Date(season.endDate).toLocaleDateString() : 'Open ended'}
              </p>
              <p className="mt-3 max-w-2xl text-sm text-white/45">
                This page now acts as the season control room. Build divisions here, see the teams stacked under each division,
                and jump directly into team creation or roster operations from the right place.
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
                <div className="text-xs uppercase tracking-wide text-white/40">Teams</div>
                <div className="mt-1 text-white font-semibold">{teams.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6">
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

            <form onSubmit={handleDivisionSubmit} className="space-y-4">
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
              <Shield className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Season Controls</h2>
            </div>
            <div className="space-y-3 text-sm">
              <Link
                href={`/dashboard/seasons/${seasonId}/registration`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <span>Registration Form Settings</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
              <Link
                href={`/dashboard/schedule-generator?seasonId=${seasonId}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <span>Generate Schedule For Season</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Divisions and Teams</h2>
              <p className="mt-1 text-sm text-white/45">Visual stack of each division with its teams and direct actions.</p>
            </div>
          </div>

          {divisions.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
              No divisions exist for this season yet.
            </div>
          ) : (
            <div className="space-y-4">
              {divisions.map((division) => {
                const stackedTeams = divisionTeams.get(division.id) || []
                return (
                  <div key={division.id} className="rounded-2xl border border-white/10 bg-white/5 p-5" data-testid={`division-card-${division.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{division.name}</h3>
                        <p className="mt-1 text-sm text-white/50">Level {division.level}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
                          <span>{stackedTeams.length} teams</span>
                          <span>{division.playerCount} rostered players</span>
                          <span>Roster target {division.minRosterSize}-{division.maxRosterSize}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/teams/create?seasonId=${seasonId}&divisionId=${division.id}`}
                          className="rounded-md bg-cyan-500/20 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30"
                          data-testid={`create-team-for-division-${division.id}`}
                        >
                          Add Team
                        </Link>
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

                    <div className="mt-5 space-y-3">
                      {stackedTeams.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/40">
                          No teams in this division yet.
                        </div>
                      ) : (
                        stackedTeams.map((team) => {
                          const approvedRosterCount = team.players.filter((player) => player.status === 'APPROVED').length
                          const pendingRosterCount = team.players.filter((player) => player.status === 'PENDING').length
                          return (
                            <div key={team.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4" data-testid={`season-team-card-${team.id}`}>
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    className="mt-1 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold"
                                    style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                                  >
                                    {team.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Link href={`/dashboard/teams/${team.id}`} className="text-base font-semibold text-white hover:text-cyan-200">
                                        {team.name}
                                      </Link>
                                      {team.approvalStatus === 'APPROVED' ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 text-xs text-green-300">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Approved
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                                          {team.approvalStatus}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/40">
                                      <span>{approvedRosterCount} approved players</span>
                                      <span>{pendingRosterCount} pending</span>
                                      <span>{team.isConfirmed ? 'Confirmed' : 'Not confirmed'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/dashboard/teams/${team.id}`}
                                    className="rounded-md bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                                  >
                                    Open Team
                                  </Link>
                                  {team.approvalStatus !== 'APPROVED' && (
                                    <button
                                      onClick={() => updateTeamApproval(team.id, 'APPROVE')}
                                      disabled={teamActionLoading !== null}
                                      className="rounded-md bg-green-500/20 px-3 py-2 text-sm text-green-200 hover:bg-green-500/30 disabled:opacity-50"
                                      data-testid={`approve-team-${team.id}`}
                                    >
                                      {teamActionLoading === `APPROVE-${team.id}` ? 'Approving...' : 'Approve Team'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
