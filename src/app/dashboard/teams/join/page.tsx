'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

interface Team {
  id: string
  name: string
  division: string
  primaryColor: string
  secondaryColor: string
  captainName: string
  playersCount: number
  openSlots: number
}

function JoinTeamContent() {
  const searchParams = useSearchParams()
  const { user, loading: sessionLoading } = useSessionUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [team, setTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [mode, setMode] = useState<'code' | 'browse'>('code')

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      setTeams((Array.isArray(data) ? data : []).slice(0, 10).map((t: any, i: number) => ({
        id: t.id,
        name: t.name,
        division: 'Open',
        primaryColor: t.primaryColor || '#FF0000',
        secondaryColor: t.secondaryColor || '#FFFFFF',
        captainName: 'Captain',
        playersCount: 8 + i,
        openSlots: Math.max(0, 5 - i),
      })))
    } catch {
      console.error('Failed to fetch teams')
    }
  }

  const lookupTeam = async (overrideCode?: string) => {
    const codeToUse = (overrideCode || inviteCode).trim()
    if (!codeToUse) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')
    setTeam(null)

    try {
      const res = await fetch(`/api/teams/${codeToUse}`)
      
      if (res.ok) {
        const data = await res.json()
        setTeam({
          id: data.id,
          name: data.name,
          division: data.divisionId || 'Open',
          primaryColor: data.primaryColor || '#FF0000',
          secondaryColor: data.secondaryColor || '#FFFFFF',
          captainName: 'Team Captain',
          playersCount: 7,
          openSlots: 3,
        })
      } else {
        setError('Invalid invite code. Please check and try again.')
      }
    } catch {
      setError('Failed to lookup team. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const requestToJoin = async () => {
    if (!user || !team) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: team.id }),
      })

      if (res.ok) {
        setSuccess(`Request sent to ${team.name}! The captain will review your request.`)
        setTeam(null)
        setInviteCode('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send request')
      }
    } catch {
      setError('Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  const joinTeam = (teamId: string) => {
    if (!user) {
      setError('Please log in first')
      return
    }
    setInviteCode(teamId)
    lookupTeam(teamId)
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to join a team</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Join a Team</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('code')}
            className={`flex-1 py-2 rounded-lg ${mode === 'code' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white'}`}
          >
            Invite Code
          </button>
          <button
            onClick={() => setMode('browse')}
            className={`flex-1 py-2 rounded-lg ${mode === 'browse' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white'}`}
          >
            Browse Teams
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-4">
            <Check className="inline w-4 h-4 mr-2" />
            {success}
          </div>
        )}

        {mode === 'code' ? (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white uppercase"
                placeholder="Enter invite code (e.g., TEAM-ABC123)"
              />
              <button
                onClick={() => lookupTeam()}
                disabled={loading}
                className="btn-primary px-6"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Lookup'}
              </button>
            </div>

            {team && (
              <div data-testid="team-lookup-result" className="mt-6 glass-card p-4 border-2 border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{team.name}</p>
                      <p className="text-white/50 text-sm">{team.division} | {team.captainName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-bold">{team.openSlots} slots</p>
                    <p className="text-white/40 text-xs">available</p>
                  </div>
                </div>

                <button
                  onClick={requestToJoin}
                  disabled={loading || team.openSlots === 0}
                  className="w-full mt-4 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Request to Join <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-white/50 mb-4">Teams accepting new players:</p>
            
            <div className="space-y-3">
              {teams.map((team) => (
                <div data-testid={`browse-team-${team.id}`} key={team.id} className="glass-card p-4 hover:border-cyan-500/30 cursor-pointer transition" onClick={() => joinTeam(team.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}>
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{team.name}</p>
                        <p className="text-white/40 text-xs">{team.division}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold ${team.openSlots > 0 ? 'text-green-400' : 'text-red-400'}`}>{team.openSlots > 0 ? `${team.openSlots} slots` : 'Full'}</p>
                      <ArrowRight className="w-4 h-4 text-white/30" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {teams.length === 0 && <p className="text-white/40 text-center py-8">No teams available. Check back later or ask for an invite code.</p>}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm"><strong>How it works:</strong> Get an invite code from your team captain, or browse available teams. Once you request to join, the captain will approve or reject your request.</p>
        </div>
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <JoinTeamContent />
    </Suspense>
  )
}
