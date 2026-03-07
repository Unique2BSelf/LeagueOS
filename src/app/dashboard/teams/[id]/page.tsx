'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, ImagePlus, Loader2, RefreshCw, Search, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

interface Team {
  id: string
  name: string
  captainId: string
  divisionId: string
  division?: { id: string; name: string }
  season?: { id: string; name: string; minRosterSize?: number; maxRosterSize?: number }
  primaryColor: string
  secondaryColor: string
  currentBalance: number
  escrowTarget: number
  isConfirmed: boolean
  approvalStatus?: string
  rosterStatus?: 'DRAFT' | 'SUBMITTED' | 'FINALIZED'
  isArchived?: boolean
  jerseyPhotoUrl?: string | null
  inviteCode?: string | null
  inviteCodeExpiry?: Date | null
}

interface Player {
  userId: string
  status: string
  joinedAt: Date
  user?: {
    fullName: string
    email: string
    role: string
  }
}

interface SearchUser {
  id: string
  fullName: string
  email: string
  role: string
  teams: Array<{
    teamId: string
    teamName: string
    status: string
    seasonId?: string
    divisionId?: string
  }>
}

export default function TeamDashboardPage() {
  const params = useParams()
  const teamId = params.id as string
  const { user, loading: sessionLoading } = useSessionUser()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [rosterActionLoading, setRosterActionLoading] = useState<string | null>(null)
  const [rosterStatusLoading, setRosterStatusLoading] = useState<string | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [jerseyLoading, setJerseyLoading] = useState(false)
  const [isCaptain, setIsCaptain] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  const approvedPlayers = useMemo(() => players.filter((player) => player.status === 'APPROVED'), [players])
  const pendingPlayers = useMemo(() => players.filter((player) => player.status === 'PENDING'), [players])

  useEffect(() => {
    if (user) {
      fetchTeamData(teamId, user.id)
    } else if (!sessionLoading) {
      setLoading(false)
      setError('Please log in to view this page')
    }
  }, [teamId, user, sessionLoading])

  useEffect(() => {
    if (!user || user.role !== 'ADMIN' || !team || searchTerm.trim().length < 2) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}&limit=10`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error('Failed to search users')
        }
        const payload = await res.json()
        const results = (payload.users || []).filter((candidate: SearchUser) => candidate.id !== user.id)
        setSearchResults(results)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to search users')
        }
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [searchTerm, team, user])

  const fetchTeamData = async (id: string, userId: string) => {
    setLoading(true)
    setError('')

    try {
      const [teamRes, playersRes] = await Promise.all([
        fetch(`/api/teams/${id}`),
        fetch(`/api/teams/${id}/players`),
      ])

      if (!teamRes.ok) {
        setError('Team not found')
        setLoading(false)
        return
      }

      const teamData = await teamRes.json()
      setTeam(teamData)
      setIsCaptain(teamData.captainId === userId)

      if (playersRes.ok) {
        const playersData = await playersRes.json()
        setPlayers(playersData)
      }
    } catch {
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const generateInviteCode = async () => {
    setInviteLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setTeam((prev: any) => ({ ...prev, inviteCode: data.inviteCode, inviteCodeExpiry: data.expiresAt }))
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to generate invite code')
      }
    } catch {
      setError('Failed to generate invite code')
    } finally {
      setInviteLoading(false)
    }
  }

  const revokeInviteCode = async () => {
    setInviteLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setTeam((prev: any) => ({ ...prev, inviteCode: null, inviteCodeExpiry: null }))
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to revoke invite code')
      }
    } catch {
      setError('Failed to revoke invite code')
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInviteLink = () => {
    if (!team?.inviteCode) return
    const link = `${window.location.origin}/teams/join/${team.inviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateRosterEntry = async (targetUserId: string, action: 'APPROVE' | 'REMOVE' | 'REJECT') => {
    setRosterActionLoading(`${action}-${targetUserId}`)
    setError('')

    try {
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, action }),
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update roster')
      }

      await fetchTeamData(teamId, user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to update roster')
    } finally {
      setRosterActionLoading(null)
    }
  }

  const adminAssignToTeam = async (targetUser: SearchUser) => {
    if (!team) return
    setRosterActionLoading(`MOVE-${targetUser.id}`)
    setError('')

    try {
      const res = await fetch('/api/admin/rosters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          teamId: team.id,
          action: 'MOVE',
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to roster player')
      }

      setSearchTerm('')
      setSearchResults([])
      await fetchTeamData(team.id, user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to roster player')
    } finally {
      setRosterActionLoading(null)
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error && !team) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass-card p-8 text-center">
          <X className="mx-auto mb-4 h-16 w-16 text-red-400" />
          <h1 className="mb-2 text-2xl font-bold text-white">Error</h1>
          <p className="mb-6 text-white/50">{error}</p>
          <Link href="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isInviteValid = team?.inviteCode && team?.inviteCodeExpiry && new Date(team.inviteCodeExpiry) > new Date()
  const canManageRoster = isCaptain || user?.role === 'ADMIN'
  const approvedCount = approvedPlayers.length
  const pendingCount = pendingPlayers.length
  const minRosterSize = team?.season?.minRosterSize ?? 8
  const maxRosterSize = team?.season?.maxRosterSize ?? 16
  const rosterStatus = team?.rosterStatus || 'DRAFT'
  const rosterStatusTone =
    rosterStatus === 'FINALIZED'
      ? 'bg-green-500/15 text-green-300'
      : rosterStatus === 'SUBMITTED'
        ? 'bg-cyan-500/15 text-cyan-300'
        : 'bg-amber-500/15 text-amber-300'

  const updateRosterStatus = async (nextStatus: 'DRAFT' | 'SUBMITTED' | 'FINALIZED') => {
    if (!team) return
    setRosterStatusLoading(nextStatus)
    setError('')

    try {
      const res = await fetch(`/api/teams/${team.id}/roster-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterStatus: nextStatus }),
        credentials: 'include',
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update roster status')
      }

      setTeam((current) => current ? { ...current, rosterStatus: payload.rosterStatus } : current)
    } catch (err: any) {
      setError(err.message || 'Failed to update roster status')
    } finally {
      setRosterStatusLoading(null)
    }
  }

  const updateArchivedState = async (action: 'ARCHIVE' | 'UNARCHIVE') => {
    if (!team) return
    setArchiveLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: [team.id],
          action,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || `Failed to ${action.toLowerCase()} team`)
      }

      setTeam((current) => current ? { ...current, isArchived: action === 'ARCHIVE' } : current)
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} team`)
    } finally {
      setArchiveLoading(false)
    }
  }

  const uploadJersey = async (file: File | null) => {
    if (!file || !team) return
    setJerseyLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/teams/${team.id}/jersey`, {
        method: 'POST',
        body: formData,
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to upload jersey image')
      }
      await fetchTeamData(team.id, user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to upload jersey image')
    } finally {
      setJerseyLoading(false)
    }
  }

  const removeJersey = async () => {
    if (!team) return
    setJerseyLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/teams/${team.id}/jersey`, {
        method: 'DELETE',
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to remove jersey image')
      }
      await fetchTeamData(team.id, user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to remove jersey image')
    } finally {
      setJerseyLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="mb-2">
        <Link href={team?.season?.id ? `/dashboard/seasons/${team.season.id}` : '/teams'} className="mb-4 inline-flex items-center gap-2 text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          {team?.season?.id ? 'Back to Season Team Stack' : 'Back to Teams'}
        </Link>

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold"
                style={{ backgroundColor: team?.primaryColor || '#FF0000', color: team?.secondaryColor || '#FFFFFF' }}
              >
                {team?.name?.slice(0, 2).toUpperCase() || 'TM'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{team?.name}</h1>
                <p className="text-white/50">
                  {team?.division?.name || 'Open Division'} | {team?.season?.name || 'Current Season'}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/40">
                  <span>{approvedCount} approved players</span>
                  <span>{pendingCount} pending</span>
                  <span>Roster target {minRosterSize}-{maxRosterSize}</span>
                  {team?.isArchived && <span className="text-amber-300">Archived team</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wide text-white/40">Approval</div>
                <div className="mt-1 text-white font-semibold">{team?.approvalStatus || 'PENDING'}</div>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wide text-white/40">Escrow</div>
                <div className="mt-1 text-white font-semibold">${team?.currentBalance?.toFixed(0) || '0'}</div>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wide text-white/40">Official Roster</div>
                <div className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${rosterStatusTone}`} data-testid="team-roster-status-badge">
                  {rosterStatus}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wide text-white/40">Archive State</div>
                <div className="mt-1 text-white font-semibold">{team?.isArchived ? 'Archived' : 'Active'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/20 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40">Official Roster Workflow</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rosterStatusTone}`}>
                      {rosterStatus}
                    </span>
                    {approvedCount < minRosterSize && (
                      <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">
                        Below minimum roster
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    Use Draft while building the team, Submitted when it is ready for league review, and Finalized once the official roster is locked.
                  </p>
                </div>
                {canManageRoster && (
                  <div className="flex flex-wrap gap-2">
                    {(['DRAFT', 'SUBMITTED', 'FINALIZED'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateRosterStatus(status)}
                        disabled={rosterStatusLoading !== null || rosterStatus === status}
                        className={`rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50 ${
                          rosterStatus === status
                            ? 'bg-white/15 text-white'
                            : 'bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                        }`}
                        data-testid={`set-roster-status-${status.toLowerCase()}`}
                      >
                        {rosterStatusLoading === status ? 'Updating...' : status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {user?.role === 'ADMIN' && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <button
                    onClick={() => updateArchivedState(team?.isArchived ? 'UNARCHIVE' : 'ARCHIVE')}
                    disabled={archiveLoading}
                    className="rounded-md bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                    data-testid="team-archive-toggle"
                  >
                    {archiveLoading ? 'Saving...' : team?.isArchived ? 'Restore Team From Archive' : 'Archive Team'}
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Roster</h2>
              </div>
              <span className="text-white/50">{players.length} members</span>
            </div>

            {players.length > 0 ? (
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.userId} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3" data-testid="team-roster-entry">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
                        <Users className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{player.user?.fullName || 'Unknown Player'}</p>
                        <p className="text-xs text-white/40">{player.user?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          player.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {player.status}
                      </span>
                      {canManageRoster && (
                        <div className="mt-2 flex justify-end gap-2">
                          {player.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => updateRosterEntry(player.userId, 'APPROVE')}
                                disabled={!!rosterActionLoading}
                                className="rounded-md bg-green-500/20 px-2 py-1 text-xs text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                                data-testid={`approve-player-${player.userId}`}
                              >
                                {rosterActionLoading === `APPROVE-${player.userId}` ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => updateRosterEntry(player.userId, 'REJECT')}
                                disabled={!!rosterActionLoading}
                                className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                                data-testid={`reject-player-${player.userId}`}
                              >
                                {rosterActionLoading === `REJECT-${player.userId}` ? 'Rejecting...' : 'Reject'}
                              </button>
                            </>
                          )}
                          {player.status === 'APPROVED' && player.userId !== team?.captainId && (
                            <button
                              onClick={() => updateRosterEntry(player.userId, 'REMOVE')}
                              disabled={!!rosterActionLoading}
                              className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                              data-testid={`remove-player-${player.userId}`}
                            >
                              {rosterActionLoading === `REMOVE-${player.userId}` ? 'Removing...' : 'Remove'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-white/40">No players on this team yet</p>
            )}
          </div>

          {user?.role === 'ADMIN' && team && (
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Admin Roster Assignment</h2>
              </div>
              <p className="mb-4 text-sm text-white/50">
                Search players and roster them directly onto this team without using an invite code. This is the usable admin flow.
              </p>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search players by name or email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white"
                  data-testid="team-admin-search-input"
                />
              </div>

              <div className="mt-4 space-y-2">
                {searching && <div className="text-sm text-white/50">Searching...</div>}
                {!searching && searchTerm.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="text-sm text-white/40">No matching users found.</div>
                )}
                {searchResults.map((candidate) => {
                  const currentSeasonTeam = candidate.teams.find((membership) => membership.seasonId === team.season?.id && membership.status === 'APPROVED')
                  const alreadyOnThisTeam = currentSeasonTeam?.teamId === team.id
                  return (
                    <div key={candidate.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3" data-testid={`team-admin-search-result-${candidate.id}`}>
                      <div>
                        <div className="font-medium text-white">{candidate.fullName}</div>
                        <div className="text-xs text-white/40">{candidate.email}</div>
                        {currentSeasonTeam && (
                        <div className="mt-1 text-xs text-amber-300">
                            Currently on {currentSeasonTeam.teamName} for this season
                          </div>
                        )}
                        {team.rosterStatus === 'FINALIZED' && (
                          <div className="mt-1 text-xs text-cyan-300">
                            Admin override will reopen this finalized roster to Draft.
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => adminAssignToTeam(candidate)}
                        disabled={alreadyOnThisTeam || !!rosterActionLoading}
                        className="rounded-md bg-cyan-500/20 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                        data-testid={`team-admin-assign-${candidate.id}`}
                      >
                        {alreadyOnThisTeam ? 'Already on team' : rosterActionLoading === `MOVE-${candidate.id}` ? 'Assigning...' : currentSeasonTeam ? 'Move Here' : 'Add to Team'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Jersey</h2>
            </div>
            {team?.jerseyPhotoUrl ? (
              <div className="space-y-4">
                <img
                  src={team.jerseyPhotoUrl}
                  alt={`${team.name} jersey`}
                  className="h-48 w-full rounded-xl object-cover border border-white/10 bg-black/20"
                />
                {(isCaptain || user?.role === 'ADMIN') && (
                  <div className="flex flex-wrap gap-2">
                    <label className="rounded-md bg-cyan-500/20 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/30 cursor-pointer">
                      {jerseyLoading ? 'Uploading...' : 'Replace Jersey'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => void uploadJersey(e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      onClick={removeJersey}
                      disabled={jerseyLoading}
                      className="rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/45">
                <p>No jersey image uploaded yet.</p>
                {(isCaptain || user?.role === 'ADMIN') && (
                  <label className="mt-3 inline-block rounded-md bg-cyan-500/20 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/30 cursor-pointer">
                    {jerseyLoading ? 'Uploading...' : 'Upload Jersey Image'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => void uploadJersey(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {(isCaptain || user?.role === 'ADMIN') && (
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Invite Players</h2>
              </div>

              <p className="mb-4 text-white/50">
                Invite codes are still available for captain-driven joins, but admins now also have direct roster assignment on this page.
              </p>

              {team?.inviteCode && isInviteValid ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-white/50">Invite Code</span>
                      <span className="flex items-center gap-1 text-sm text-green-400">
                        <Check className="h-3 w-3" /> Valid
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-bold tracking-wider text-white">{team.inviteCode}</p>
                    <p className="mt-1 text-xs text-white/40">Expires: {new Date(team.inviteCodeExpiry!).toLocaleDateString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={copyInviteLink} disabled={copied} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy Invite Link'}
                    </button>
                    <button onClick={generateInviteCode} disabled={inviteLoading} className="btn-secondary flex items-center justify-center gap-2">
                      {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      New Code
                    </button>
                    <button onClick={revokeInviteCode} disabled={inviteLoading} className="btn-danger">
                      Revoke
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={generateInviteCode} disabled={inviteLoading} className="btn-primary flex items-center justify-center gap-2">
                  {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Generate Invite Code
                </button>
              )}
            </div>
          )}

          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Team Summary</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-white/50">Current Balance</p>
                <p className="text-2xl font-bold text-white">${team?.currentBalance?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-white/50">Escrow Target</p>
                <p className="text-2xl font-bold text-white">${team?.escrowTarget?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-white/50">Approved Players</p>
                <p className="text-2xl font-bold text-white">{approvedCount}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-white/50">Pending Players</p>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
