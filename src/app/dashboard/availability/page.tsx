'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSessionUser } from '@/hooks/use-session-user'
import { Calendar, Check, X, HelpCircle, Loader2, Clock, MapPin } from 'lucide-react'

type AvailabilityStatus = 'YES' | 'NO' | 'MAYBE' | null

type Match = {
  id: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  field: string
  location: string
  seasonName: string
  myStatus: AvailabilityStatus
}

export default function AvailabilityPage() {
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userLoading) {
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    void fetchMatches()
  }, [user, userLoading])

  const fetchMatches = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/availability')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load availability')
      }

      setMatches(data.matches || [])
    } catch (err) {
      console.error('Failed to fetch availability:', err)
      setError(err instanceof Error ? err.message : 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (matchId: string, status: Exclude<AvailabilityStatus, null>) => {
    setSaving(matchId)
    setError('')

    const previous = matches
    setMatches((current) => current.map((match) => (
      match.id === matchId ? { ...match, myStatus: status } : match
    )))

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save availability')
      }
    } catch (err) {
      console.error('Failed to save availability:', err)
      setMatches(previous)
      setError(err instanceof Error ? err.message : 'Failed to save availability')
    } finally {
      setSaving(null)
    }
  }

  const stats = useMemo(() => ({
    yes: matches.filter((match) => match.myStatus === 'YES').length,
    maybe: matches.filter((match) => match.myStatus === 'MAYBE').length,
    no: matches.filter((match) => match.myStatus === 'NO').length,
  }), [matches])

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
          <p className="text-white mb-4">Please log in to manage availability</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Match Availability</h1>
        <p className="text-white/50 mb-6">Mark your status for upcoming rostered matches.</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.yes}</p>
            <p className="text-white/50 text-sm">Available</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.maybe}</p>
            <p className="text-white/50 text-sm">Maybe</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.no}</p>
            <p className="text-white/50 text-sm">Unavailable</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="glass-card p-4" data-testid="availability-match-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-white/40 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {match.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {match.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.field} · {match.location}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 mt-1">{match.seasonName}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(match.id, 'YES')}
                  disabled={saving === match.id}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    match.myStatus === 'YES'
                      ? 'bg-green-500 text-black'
                      : 'bg-white/5 text-white hover:bg-green-500/20'
                  }`}
                  data-testid={`availability-yes-${match.id}`}
                >
                  {saving === match.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  I&apos;ll Play
                </button>
                <button
                  onClick={() => updateStatus(match.id, 'MAYBE')}
                  disabled={saving === match.id}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    match.myStatus === 'MAYBE'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/5 text-white hover:bg-yellow-500/20'
                  }`}
                  data-testid={`availability-maybe-${match.id}`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Maybe
                </button>
                <button
                  onClick={() => updateStatus(match.id, 'NO')}
                  disabled={saving === match.id}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    match.myStatus === 'NO'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-white hover:bg-red-500/20'
                  }`}
                  data-testid={`availability-no-${match.id}`}
                >
                  <X className="w-4 h-4" />
                  Can&apos;t Play
                </button>
              </div>
            </div>
          ))}
        </div>

        {matches.length === 0 && (
          <p className="text-white/40 text-center py-8">
            No upcoming rostered matches scheduled yet.
          </p>
        )}
      </div>
    </div>
  )
}

