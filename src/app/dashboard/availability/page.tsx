'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Check, X, HelpCircle, Loader2, Clock, MapPin } from 'lucide-react'

interface Match {
  id: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  field: string
  myStatus: 'YES' | 'NO' | 'MAYBE' | null
}

export default function AvailabilityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      setUser(JSON.parse(stored))
      fetchMatches()
    }
    setLoading(false)
  }, [])

  const fetchMatches = async () => {
    // Mock upcoming matches
    setMatches([
      { id: 'm1', date: '2026-03-08', time: '10:00 AM', homeTeam: 'FC United', awayTeam: 'City Kickers', field: 'Field 1', myStatus: null },
      { id: 'm2', date: '2026-03-08', time: '12:00 PM', homeTeam: 'Riverside FC', awayTeam: 'FC United', field: 'Field 2', myStatus: null },
      { id: 'm3', date: '2026-03-15', time: '10:00 AM', homeTeam: 'FC United', awayTeam: 'Thunder FC', field: 'Field 1', myStatus: null },
      { id: 'm4', date: '2026-03-15', time: '02:00 PM', homeTeam: 'City Kickers', awayTeam: 'Riverside FC', field: 'Field 3', myStatus: null },
      { id: 'm5', date: '2026-03-22', time: '11:00 AM', homeTeam: 'Wolf Pack', awayTeam: 'FC United', field: 'Field 2', myStatus: null },
    ])
  }

  const updateStatus = async (matchId: string, status: 'YES' | 'NO' | 'MAYBE') => {
    setSaving(matchId)
    
    // Update local state
    setMatches(matches.map(m => 
      m.id === matchId ? { ...m, myStatus: status } : m
    ))

    // In production: call API to save availability
    // await fetch('/api/availability', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ matchId, status }),
    // })

    setSaving(null)
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

  const yesCount = matches.filter(m => m.myStatus === 'YES').length
  const noCount = matches.filter(m => m.myStatus === 'NO').length
  const maybeCount = matches.filter(m => m.myStatus === 'MAYBE').length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Match Availability</h1>
        <p className="text-white/50 mb-6">Let your team know if you can play</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{yesCount}</p>
            <p className="text-white/50 text-sm">Available</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{maybeCount}</p>
            <p className="text-white/50 text-sm">Maybe</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{noCount}</p>
            <p className="text-white/50 text-sm">Unavailable</p>
          </div>
        </div>

        {/* Matches */}
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <div className="flex items-center gap-3 text-white/40 text-sm">
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
                        {match.field}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(match.id, 'YES')}
                  disabled={saving === match.id}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    match.myStatus === 'YES'
                      ? 'bg-green-500 text-black'
                      : 'bg-white/5 text-white hover:bg-green-500/20'
                  }`}
                >
                  {saving === match.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      I'll Play
                    </>
                  )}
                </button>
                <button
                  onClick={() => updateStatus(match.id, 'MAYBE')}
                  disabled={saving === match.id}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                    match.myStatus === 'MAYBE'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/5 text-white hover:bg-yellow-500/20'
                  }`}
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
                >
                  <X className="w-4 h-4" />
                  Can't Play
                </button>
              </div>
            </div>
          ))}
        </div>

        {matches.length === 0 && (
          <p className="text-white/40 text-center py-8">
            No upcoming matches scheduled
          </p>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            <strong>Reminder:</strong> Please mark your availability at least 24 hours 
            before each match. This helps captains plan substitutions.
          </p>
        </div>
      </div>
    </div>
  )
}
