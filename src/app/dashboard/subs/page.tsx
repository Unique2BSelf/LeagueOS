'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Calendar, ArrowRightLeft, ShieldAlert } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

type EligibleMatch = {
  id: string
  teamId: string
  scheduledAt: string
  homeTeam: string
  awayTeam: string
  seasonName: string
  hasOpenRequest: boolean
}

type MyRequest = {
  id: string
  matchId: string
  teamId: string
  status: 'OPEN' | 'CLAIMED' | 'CANCELLED'
  approved: boolean
  createdAt: string
  claimedBy: string | null
  match: {
    scheduledAt: string
    homeTeam: string
    awayTeam: string
    seasonName: string
  }
}

type AvailableRequest = {
  id: string
  matchId: string
  teamId: string
  requestedById: string
  requestedByName: string
  status: 'OPEN' | 'CLAIMED' | 'CANCELLED'
  createdAt: string
  teamName: string
  match: {
    scheduledAt: string
    homeTeam: string
    awayTeam: string
    seasonName: string
  }
  eligibility: {
    eligible: boolean
    reason?: string
    isRinger?: boolean
    isGoalieException?: boolean
    requiresInsurance?: boolean
    quotaExhausted?: boolean
  }
}

export default function SubsPage() {
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [eligibleMatches, setEligibleMatches] = useState<EligibleMatch[]>([])
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [availableRequests, setAvailableRequests] = useState<AvailableRequest[]>([])

  useEffect(() => {
    if (userLoading) {
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    void fetchSubs()
  }, [user, userLoading])

  const fetchSubs = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/subs')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load sub requests')
      }

      setEligibleMatches(data.eligibleMatches || [])
      setMyRequests(data.myRequests || [])
      setAvailableRequests(data.availableRequests || [])
    } catch (err) {
      console.error('Failed to load sub requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sub requests')
    } finally {
      setLoading(false)
    }
  }

  const requestSub = async (matchId: string) => {
    setSaving(`request-${matchId}`)
    setError('')

    try {
      const res = await fetch('/api/subs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sub request')
      }

      await fetchSubs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub request')
    } finally {
      setSaving(null)
    }
  }

  const updateRequest = async (id: string, action: 'claim' | 'cancel') => {
    setSaving(`${action}-${id}`)
    setError('')

    try {
      const res = await fetch('/api/subs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update sub request')
      }

      await fetchSubs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sub request')
    } finally {
      setSaving(null)
    }
  }

  const stats = useMemo(() => ({
    open: myRequests.filter((request) => request.status === 'OPEN').length,
    claimed: myRequests.filter((request) => request.status === 'CLAIMED').length,
    available: availableRequests.filter((request) => request.eligibility.eligible).length,
  }), [myRequests, availableRequests])

  const formatMatchTime = (value: string) => new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to manage sub requests</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Sub Requests</h1>
        <p className="text-white/50">Request a fill-in when you can&apos;t play and claim open requests when you are eligible.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{stats.open}</p>
          <p className="text-white/50 text-sm">Open Requests</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.claimed}</p>
          <p className="text-white/50 text-sm">Claimed For You</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.available}</p>
          <p className="text-white/50 text-sm">Requests You Can Claim</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">Request a Sub</h2>
          <div className="space-y-3">
            {eligibleMatches.length === 0 && (
              <p className="text-white/40">No upcoming matches available for sub requests.</p>
            )}
            {eligibleMatches.map((match) => (
              <div key={match.id} className="rounded-lg bg-white/5 p-4" data-testid="sub-eligible-match">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">{match.homeTeam} vs {match.awayTeam}</p>
                    <p className="text-white/40 text-sm">{formatMatchTime(match.scheduledAt)} · {match.seasonName}</p>
                  </div>
                  <button
                    onClick={() => requestSub(match.id)}
                    disabled={match.hasOpenRequest || saving === `request-${match.id}`}
                    className="btn-primary disabled:opacity-50"
                    data-testid={`request-sub-${match.id}`}
                  >
                    {saving === `request-${match.id}` ? 'Saving...' : match.hasOpenRequest ? 'Requested' : 'Request Sub'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">My Requests</h2>
          <div className="space-y-3">
            {myRequests.length === 0 && (
              <p className="text-white/40">You haven&apos;t requested any subs yet.</p>
            )}
            {myRequests.map((request) => (
              <div key={request.id} className="rounded-lg bg-white/5 p-4" data-testid="my-sub-request">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">{request.match.homeTeam} vs {request.match.awayTeam}</p>
                    <p className="text-white/40 text-sm">{formatMatchTime(request.match.scheduledAt)} · {request.match.seasonName}</p>
                    <p className="text-xs mt-2 text-cyan-300">Status: {request.status}{request.claimedBy ? ` · Claimed by ${request.claimedBy}` : ''}</p>
                  </div>
                  {request.status === 'OPEN' && (
                    <button
                      onClick={() => updateRequest(request.id, 'cancel')}
                      disabled={saving === `cancel-${request.id}`}
                      className="btn-secondary"
                      data-testid={`cancel-sub-${request.id}`}
                    >
                      {saving === `cancel-${request.id}` ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Available Requests to Claim</h2>
        <div className="space-y-3">
          {availableRequests.length === 0 && (
            <p className="text-white/40">No open requests are available right now.</p>
          )}
          {availableRequests.map((request) => (
            <div key={request.id} className="rounded-lg bg-white/5 p-4" data-testid="available-sub-request">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-white font-semibold">{request.match.homeTeam} vs {request.match.awayTeam}</p>
                  <p className="text-white/40 text-sm">{formatMatchTime(request.match.scheduledAt)} · {request.teamName} · Requested by {request.requestedByName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {request.eligibility.isGoalieException ? (
                      <span className="rounded-full bg-blue-500/20 px-2 py-1 text-blue-300">Goalie exception</span>
                    ) : null}
                    {request.eligibility.isRinger ? (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-yellow-300 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Ringer review
                      </span>
                    ) : null}
                    {!request.eligibility.eligible ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-300">{request.eligibility.reason || 'Not eligible'}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => updateRequest(request.id, 'claim')}
                  disabled={!request.eligibility.eligible || saving === `claim-${request.id}`}
                  className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  data-testid={`claim-sub-${request.id}`}
                >
                  {saving === `claim-${request.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Claim
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

