'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Copy, RefreshCw, Check, Loader2, AlertCircle, ArrowLeft, Shield } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

interface Team {
  id: string
  name: string
  captainId: string
  divisionId: string
  division?: { name: string }
  season?: { name: string }
  primaryColor: string
  secondaryColor: string
  currentBalance: number
  escrowTarget: number
  isConfirmed: boolean
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
  const [isCaptain, setIsCaptain] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTeamData(teamId, user.id)
    } else if (!sessionLoading) {
      setLoading(false)
      setError('Please log in to view this page')
    }
  }, [teamId, user, sessionLoading])

  const fetchTeamData = async (id: string, userId: string) => {
    setLoading(true)
    setError('')
    
    try {
      const teamRes = await fetch(`/api/teams/${id}`)
      if (!teamRes.ok) {
        setError('Team not found')
        setLoading(false)
        return
      }
      
      const teamData = await teamRes.json()
      setTeam(teamData)
      setIsCaptain(teamData.captainId === userId)
      
      const playersRes = await fetch(`/api/teams/${id}/players`)
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

  const isInviteValid = team?.inviteCode && team?.inviteCodeExpiry && new Date(team.inviteCodeExpiry) > new Date()

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error && !team) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <Link href="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/teams" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
        
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: team?.primaryColor || '#FF0000', color: team?.secondaryColor || '#FFFFFF' }}
          >
            {team?.name?.slice(0, 2).toUpperCase() || 'TM'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{team?.name}</h1>
            <p className="text-white/50">{team?.division?.name || 'Open Division'} | {team?.season?.name || 'Current Season'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {(isCaptain || user?.role === 'ADMIN') && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Invite Players</h2>
          </div>
          
          <p className="text-white/50 mb-4">
            Share this link with players you want to invite to your team. They'll be able to join directly using the invite code.
          </p>

          {team?.inviteCode && isInviteValid ? (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Invite Code</span>
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <Check className="w-3 h-3" /> Valid
                  </span>
                </div>
                <p className="text-2xl font-mono text-white font-bold tracking-wider">{team.inviteCode}</p>
                <p className="text-white/40 text-xs mt-1">
                  Expires: {new Date(team.inviteCodeExpiry!).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyInviteLink}
                  disabled={copied}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Invite Link'}
                </button>
                <button
                  onClick={generateInviteCode}
                  disabled={inviteLoading}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  New Code
                </button>
                <button
                  onClick={revokeInviteCode}
                  disabled={inviteLoading}
                  className="btn-danger"
                >
                  Revoke
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={generateInviteCode}
              disabled={inviteLoading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate Invite Code
            </button>
          )}
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Team Roster</h2>
          </div>
          <span className="text-white/50">{players.length} players</span>
        </div>

        {players.length > 0 ? (
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.userId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{player.user?.fullName || 'Unknown Player'}</p>
                    <p className="text-white/40 text-xs">{player.user?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    player.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {player.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-center py-8">No players on this team yet</p>
        )}
      </div>

      <div className="glass-card p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Team Info</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/50 text-sm">Current Balance</p>
            <p className="text-2xl font-bold text-white">${team?.currentBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/50 text-sm">Escrow Target</p>
            <p className="text-2xl font-bold text-white">${team?.escrowTarget?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
