'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Loader2, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react'

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
  season?: { id: string; name: string; minRosterSize?: number; maxRosterSize?: number }
  primaryColor: string
  secondaryColor: string
  approvalStatus: string
  rosterStatus: 'DRAFT' | 'SUBMITTED' | 'FINALIZED'
  isConfirmed: boolean
  isArchived: boolean
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
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL')
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'NEEDS_PLAYERS' | 'AT_MIN'>('ALL')
  const [workflowFilter, setWorkflowFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'FINALIZED'>('ALL')
  const [archiveFilter, setArchiveFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE')
  const [sortMode, setSortMode] = useState<'name' | 'approved' | 'pending'>('name')
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
      setExpandedDivisions((current) => {
        const next = { ...current }
        for (const division of Array.isArray(divisionsData) ? divisionsData : []) {
          if (next[division.id] === undefined) {
            next[division.id] = true
          }
        }
        return next
      })
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
      const approvedRosterCount = team.players.filter((player) => player.status === 'APPROVED').length
      const pendingRosterCount = team.players.filter((player) => player.status === 'PENDING').length
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        team.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesApproval =
        approvalFilter === 'ALL' ||
        (approvalFilter === 'APPROVED' ? team.approvalStatus === 'APPROVED' : team.approvalStatus !== 'APPROVED')
      const matchesRoster =
        rosterFilter === 'ALL' ||
        (rosterFilter === 'NEEDS_PLAYERS' ? approvedRosterCount < (team.season?.minRosterSize ?? 8) : approvedRosterCount >= (team.season?.minRosterSize ?? 8))
      const matchesWorkflow =
        workflowFilter === 'ALL' || team.rosterStatus === workflowFilter
      const matchesArchive =
        archiveFilter === 'ALL' ||
        (archiveFilter === 'ARCHIVED' ? team.isArchived : !team.isArchived)

      if (!matchesSearch || !matchesApproval || !matchesRoster || !matchesWorkflow || !matchesArchive) {
        continue
      }

      const existing = grouped.get(team.divisionId) || []
      existing.push(team)
      grouped.set(team.divisionId, existing)
    }

    for (const [divisionId, divisionTeams] of grouped.entries()) {
      divisionTeams.sort((a, b) => {
        const aApproved = a.players.filter((player) => player.status === 'APPROVED').length
        const bApproved = b.players.filter((player) => player.status === 'APPROVED').length
        const aPending = a.players.filter((player) => player.status === 'PENDING').length
        const bPending = b.players.filter((player) => player.status === 'PENDING').length

        if (sortMode === 'approved') {
          return bApproved - aApproved || a.name.localeCompare(b.name)
        }
        if (sortMode === 'pending') {
          return bPending - aPending || a.name.localeCompare(b.name)
        }
        return a.name.localeCompare(b.name)
      })
      grouped.set(divisionId, divisionTeams)
    }

    return grouped
  }, [approvalFilter, archiveFilter, rosterFilter, searchTerm, sortMode, teams, workflowFilter])

  const visibleTeamCount = useMemo(
    () => Array.from(divisionTeams.values()).reduce((total, divisionList) => total + divisionList.length, 0),
    [divisionTeams],
  )

  const pendingVisibleTeams = useMemo(
    () => Array.from(divisionTeams.values()).flat().filter((team) => !team.isArchived && team.approvalStatus !== 'APPROVED').map((team) => team.id),
    [divisionTeams],
  )

  const archiveBuckets = useMemo(() => ({
    active: Array.from(divisionTeams.values()).flat().filter((team) => !team.isArchived).map((team) => team.id),
    archived: Array.from(divisionTeams.values()).flat().filter((team) => team.isArchived).map((team) => team.id),
  }), [divisionTeams])

  const visibleTeamIdsByRosterStatus = useMemo(() => ({
    DRAFT: Array.from(divisionTeams.values()).flat().filter((team) => team.rosterStatus === 'DRAFT').map((team) => team.id),
    SUBMITTED: Array.from(divisionTeams.values()).flat().filter((team) => team.rosterStatus === 'SUBMITTED').map((team) => team.id),
    FINALIZED: Array.from(divisionTeams.values()).flat().filter((team) => team.rosterStatus === 'FINALIZED').map((team) => team.id),
  }), [divisionTeams])

  const toggleDivision = (divisionId: string) => {
    setExpandedDivisions((current) => ({ ...current, [divisionId]: !current[divisionId] }))
  }

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

  const bulkApproveVisibleTeams = async () => {
    if (!pendingVisibleTeams.length) {
      return
    }

    setTeamActionLoading('BULK-APPROVE')
    setError('')
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: pendingVisibleTeams,
          action: 'APPROVE',
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to bulk approve teams')
      }
      await loadSeason()
    } catch (err: any) {
      setError(err.message || 'Failed to bulk approve teams')
    } finally {
      setTeamActionLoading(null)
    }
  }

  const bulkUpdateRosterStatus = async (nextStatus: 'DRAFT' | 'SUBMITTED' | 'FINALIZED') => {
    const teamIds = nextStatus === 'DRAFT'
      ? [...visibleTeamIdsByRosterStatus.SUBMITTED, ...visibleTeamIdsByRosterStatus.FINALIZED]
      : visibleTeamIdsByRosterStatus[nextStatus === 'SUBMITTED' ? 'DRAFT' : 'SUBMITTED']

    const activeTeamIds = teamIds.filter((teamId) => archiveBuckets.active.includes(teamId))

    if (!activeTeamIds.length) {
      return
    }

    setTeamActionLoading(`BULK-${nextStatus}`)
    setError('')
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: activeTeamIds,
          action: 'SET_ROSTER_STATUS',
          rosterStatus: nextStatus,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || `Failed to set roster status to ${nextStatus}`)
      }
      await loadSeason()
    } catch (err: any) {
      setError(err.message || `Failed to set roster status to ${nextStatus}`)
    } finally {
      setTeamActionLoading(null)
    }
  }

  const updateTeamArchive = async (teamIds: string[], action: 'ARCHIVE' | 'UNARCHIVE') => {
    if (!teamIds.length) {
      return
    }

    setTeamActionLoading(`BULK-${action}`)
    setError('')
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds,
          action,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || `Failed to ${action.toLowerCase()} teams`)
      }
      await loadSeason()
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} teams`)
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
              <p className="mt-1 text-sm text-white/45">Condensed season view with divisions as headers and teams as compact rows underneath.</p>
            </div>
            <div className="text-right text-sm text-white/40">
              <div>{visibleTeamCount} visible teams</div>
              <div>{pendingVisibleTeams.length} pending approval</div>
            </div>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 xl:grid-cols-[1.1fr,0.75fr,0.75fr,0.75fr,0.75fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teams"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white"
              />
            </div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value as typeof approvalFilter)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              <option value="ALL">All approval</option>
              <option value="APPROVED">Approved only</option>
              <option value="PENDING">Pending only</option>
            </select>
            <select
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value as typeof rosterFilter)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              <option value="ALL">All roster states</option>
              <option value="NEEDS_PLAYERS">Below min roster</option>
              <option value="AT_MIN">At/above min roster</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              <option value="name">Sort by name</option>
              <option value="approved">Sort by approved count</option>
              <option value="pending">Sort by pending count</option>
            </select>
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value as typeof workflowFilter)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              <option value="ALL">All roster workflow</option>
              <option value="DRAFT">Draft only</option>
              <option value="SUBMITTED">Submitted only</option>
              <option value="FINALIZED">Finalized only</option>
            </select>
            <select
              value={archiveFilter}
              onChange={(e) => setArchiveFilter(e.target.value as typeof archiveFilter)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white xl:col-span-5"
              data-testid="team-archive-filter"
            >
              <option value="ACTIVE">Active teams only</option>
              <option value="ARCHIVED">Archived teams only</option>
              <option value="ALL">All teams</option>
            </select>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={bulkApproveVisibleTeams}
              disabled={!pendingVisibleTeams.length || teamActionLoading !== null}
              className="rounded-lg bg-green-500/20 px-4 py-2.5 text-sm text-green-200 hover:bg-green-500/30 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-APPROVE' ? 'Approving...' : `Approve Visible (${pendingVisibleTeams.length})`}
            </button>
            <button
              onClick={() => bulkUpdateRosterStatus('SUBMITTED')}
              disabled={!visibleTeamIdsByRosterStatus.DRAFT.length || teamActionLoading !== null}
              className="rounded-lg bg-cyan-500/20 px-4 py-2.5 text-sm text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-SUBMITTED' ? 'Submitting...' : `Submit Visible Drafts (${visibleTeamIdsByRosterStatus.DRAFT.length})`}
            </button>
            <button
              onClick={() => bulkUpdateRosterStatus('FINALIZED')}
              disabled={!visibleTeamIdsByRosterStatus.SUBMITTED.length || teamActionLoading !== null}
              className="rounded-lg bg-indigo-500/20 px-4 py-2.5 text-sm text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-FINALIZED' ? 'Finalizing...' : `Finalize Visible Submitted (${visibleTeamIdsByRosterStatus.SUBMITTED.length})`}
            </button>
            <button
              onClick={() => bulkUpdateRosterStatus('DRAFT')}
              disabled={(!visibleTeamIdsByRosterStatus.SUBMITTED.length && !visibleTeamIdsByRosterStatus.FINALIZED.length) || teamActionLoading !== null}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white/85 hover:bg-white/15 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-DRAFT' ? 'Reopening...' : `Reopen Visible (${visibleTeamIdsByRosterStatus.SUBMITTED.length + visibleTeamIdsByRosterStatus.FINALIZED.length})`}
            </button>
            <button
              onClick={() => updateTeamArchive(archiveBuckets.active, 'ARCHIVE')}
              disabled={!archiveBuckets.active.length || teamActionLoading !== null}
              className="rounded-lg bg-amber-500/20 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-ARCHIVE' ? 'Archiving...' : `Archive Visible Active (${archiveBuckets.active.length})`}
            </button>
            <button
              onClick={() => updateTeamArchive(archiveBuckets.archived, 'UNARCHIVE')}
              disabled={!archiveBuckets.archived.length || teamActionLoading !== null}
              className="rounded-lg bg-emerald-500/20 px-4 py-2.5 text-sm text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {teamActionLoading === 'BULK-UNARCHIVE' ? 'Restoring...' : `Restore Visible Archived (${archiveBuckets.archived.length})`}
            </button>
          </div>

          {divisions.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
              No divisions exist for this season yet.
            </div>
          ) : (
            <div className="space-y-4">
              {divisions.map((division) => {
                const stackedTeams = divisionTeams.get(division.id) || []
                const isExpanded = expandedDivisions[division.id] ?? true
                return (
                  <div key={division.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5" data-testid={`division-card-${division.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <button
                        onClick={() => toggleDivision(division.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        data-testid={`toggle-division-${division.id}`}
                      >
                        <div className="rounded-lg bg-white/5 p-2 text-white/45">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-white">{division.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-4 text-xs text-white/40">
                            <span>Level {division.level}</span>
                            <span>{stackedTeams.length} teams</span>
                            <span>{division.playerCount} rostered players</span>
                            <span>Roster target {division.minRosterSize}-{division.maxRosterSize}</span>
                          </div>
                        </div>
                      </button>
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

                    {isExpanded && (
                      <div className="border-t border-white/10 bg-slate-950/25 px-3 py-3">
                        {stackedTeams.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/40">
                            No teams in this division yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stackedTeams.map((team) => {
                              const approvedRosterCount = team.players.filter((player) => player.status === 'APPROVED').length
                              const pendingRosterCount = team.players.filter((player) => player.status === 'PENDING').length
                              const minRosterSize = team.season?.minRosterSize ?? 8
                              const needsPlayers = approvedRosterCount < minRosterSize

                              return (
                                <div key={team.id} className="rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3" data-testid={`season-team-card-${team.id}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
                                        style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                                      >
                                        {team.name.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Link href={`/dashboard/teams/${team.id}`} className="truncate text-sm font-semibold text-white hover:text-cyan-200">
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
                                          {needsPlayers && (
                                            <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-300">
                                              Below min roster
                                            </span>
                                          )}
                                          {team.isArchived && (
                                            <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/65">
                                              Archived
                                            </span>
                                          )}
                                          <span
                                            className={`rounded-full px-2 py-1 text-xs ${
                                              team.rosterStatus === 'FINALIZED'
                                                ? 'bg-indigo-500/15 text-indigo-200'
                                                : team.rosterStatus === 'SUBMITTED'
                                                  ? 'bg-cyan-500/15 text-cyan-200'
                                                  : 'bg-white/10 text-white/70'
                                            }`}
                                          >
                                            {team.rosterStatus}
                                          </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-white/40">
                                          <span>{approvedRosterCount} approved players</span>
                                          <span>{pendingRosterCount} pending</span>
                                          <span>{team.isConfirmed ? 'Confirmed' : 'Not confirmed'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Link
                                        href={`/dashboard/teams/${team.id}`}
                                        className="rounded-md bg-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/15"
                                      >
                                        Open Team
                                      </Link>
                                      {team.approvalStatus !== 'APPROVED' && (
                                        <button
                                          onClick={() => updateTeamApproval(team.id, 'APPROVE')}
                                          disabled={teamActionLoading !== null}
                                          className="rounded-md bg-green-500/20 px-3 py-2 text-xs text-green-200 hover:bg-green-500/30 disabled:opacity-50"
                                          data-testid={`approve-team-${team.id}`}
                                        >
                                          {teamActionLoading === `APPROVE-${team.id}` ? 'Approving...' : 'Approve Team'}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => updateTeamArchive([team.id], team.isArchived ? 'UNARCHIVE' : 'ARCHIVE')}
                                        disabled={teamActionLoading !== null}
                                        className="rounded-md bg-amber-500/20 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                                        data-testid={`${team.isArchived ? 'unarchive' : 'archive'}-team-${team.id}`}
                                      >
                                        {teamActionLoading === `BULK-${team.isArchived ? 'UNARCHIVE' : 'ARCHIVE'}`
                                          ? (team.isArchived ? 'Restoring...' : 'Archiving...')
                                          : team.isArchived ? 'Restore Team' : 'Archive Team'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
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
