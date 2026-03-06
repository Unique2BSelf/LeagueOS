'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, ArrowRight, Check, Loader2, Shield, AlertCircle } from 'lucide-react'

interface TeamInfo {
  id: string
  name: string
  division: string
  season: string
  primaryColor: string
  secondaryColor: string
}

function JoinWithCodeContent() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [team, setTeam] = useState<TeamInfo | null>(null)
  const [alreadyOnTeam, setAlreadyOnTeam] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    validateInviteCode()
  }, [code])

  const validateInviteCode = async () => {
    setLoading(true)
    setError('')

    try {
      // Try the new API first
      const res = await fetch(`/api/teams/invite?code=${code}`)
      
      if (res.ok) {
        const data = await res.json()
        if (data.valid && data.team) {
          setTeam(data.team)
          
          // Check if user is already on this team
          if (user) {
            checkTeamMembership(data.team.id)
          }
        } else {
          setError(data.error || 'Invalid or expired invite code')
        }
      } else {
        setError('Invalid or expired invite code. Please check the link and try again.')
      }
    } catch (err) {
      setError('Failed to validate invite code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkTeamMembership = async (teamId: string) => {
    if (!user) return
    
    try {
      const res = await fetch(`/api/teams/${teamId}/players`)
      if (res.ok) {
        const players = await res.json()
        const isMember = players.some((p: any) => p.userId === user.id)
        if (isMember) {
          setAlreadyOnTeam(true)
        }
      }
    } catch (err) {
      console.error('Failed to check team membership')
    }
  }

  const joinTeam = async () => {
    if (!user || !team) return

    setJoining(true)
    setError('')

    try {
      const res = await fetch('/api/teams/invite/join', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: code,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Welcome to ${team.name}! You've successfully joined the team.`)
        setTeam(null)
        
        // Update local storage
        localStorage.setItem('league_user', JSON.stringify({ ...user, teamId: team.id }))
      } else {
        setError(data.error || 'Failed to join team')
      }
    } catch (err) {
      setError('Failed to join team')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/50">Validating invite code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass-card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite Link</h1>
            <p className="text-white/50 mb-6">{error}</p>
            <div className="space-y-3">
              <Link href="/login" className="block w-full btn-primary py-3">
                Login
              </Link>
              <Link href="/teams" className="block w-full btn-secondary py-3">
                Browse Teams
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You're In!</h1>
            <p className="text-white/50 mb-6">{success}</p>
            <Link href="/dashboard" className="block w-full btn-primary py-3">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4"
              style={{ backgroundColor: team?.primaryColor || '#FF0000', color: team?.secondaryColor || '#FFFFFF' }}
            >
              {team?.name?.slice(0, 2).toUpperCase() || 'TM'}
            </div>
            <h1 className="text-2xl font-bold text-white">{team?.name}</h1>
            <p className="text-white/50">{team?.division} â€¢ {team?.season}</p>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-300 font-medium">You've been invited to join!</p>
                <p className="text-white/50 text-sm mt-1">Use this link to join the team as a player.</p>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-white/70 text-center mb-4">Please login to join this team</p>
              <Link href={`/login?redirect=/teams/join/${code}`} className="block w-full btn-primary py-3 text-center">
                Login to Join
              </Link>
              <Link href="/teams" className="block w-full btn-secondary py-3 text-center">
                Browse Teams
              </Link>
            </div>
          ) : alreadyOnTeam ? (
            <div className="text-center">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-300">You're already a member of this team!</p>
              </div>
              <Link href="/dashboard" className="block w-full btn-primary py-3">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <p className="text-white/70 text-sm">Joining as:</p>
                <p className="text-white font-medium">{user.fullName}</p>
                <p className="text-white/50 text-sm">{user.email}</p>
              </div>
              <button
                onClick={joinTeam}
                disabled={joining}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>Join Team <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <Link href="/dashboard" className="block text-center text-white/50 text-sm hover:text-white">
                Cancel
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    }>
      <JoinWithCodeContent />
    </Suspense>
  )
}

