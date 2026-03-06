'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, CreditCard, CheckCircle, Clock, AlertCircle, Users, Target, Loader2 } from 'lucide-react'

interface TeamFinance {
  teamId: string
  teamName: string
  escrowTarget: number
  currentBalance: number
  playersPaid: number
  playersTotal: number
  isConfirmed: boolean
}

export default function PaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<TeamFinance[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      fetchTeams()
    }
    setLoading(false)
  }, [])

  const fetchTeams = async () => {
    // Mock team finances
    setTeams([
      { teamId: 'team-1', teamName: 'FC United', escrowTarget: 2000, currentBalance: 1500, playersPaid: 10, playersTotal: 12, isConfirmed: false },
      { teamId: 'team-2', teamName: 'City Kickers', escrowTarget: 2000, currentBalance: 2000, playersPaid: 12, playersTotal: 12, isConfirmed: true },
      { teamId: 'team-3', teamName: 'Riverside FC', escrowTarget: 1800, currentBalance: 900, playersPaid: 6, playersTotal: 12, isConfirmed: false },
    ])
  }

  const makePayment = async (teamId: string) => {
    setProcessing(teamId)
    // Simulate payment
    setTimeout(() => {
      setTeams(teams.map(t => 
        t.teamId === teamId 
          ? { ...t, currentBalance: t.currentBalance + 100, playersPaid: t.playersPaid + 1 }
          : t
      ))
      setProcessing(null)
    }, 1500)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to manage payments</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const totalRaised = teams.reduce((sum, t) => sum + t.currentBalance, 0)
  const totalTarget = teams.reduce((sum, t) => sum + t.escrowTarget, 0)
  const confirmedTeams = teams.filter(t => t.isConfirmed).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Team Payments & Escrow</h1>
        <p className="text-white/50 mb-6">Track team payment progress toward escrow targets</p>

        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">${totalRaised.toLocaleString()}</p>
            <p className="text-white/50 text-sm">Total Raised</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">${totalTarget.toLocaleString()}</p>
            <p className="text-white/50 text-sm">Total Target</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{confirmedTeams}/{teams.length}</p>
            <p className="text-white/50 text-sm">Teams Confirmed</p>
          </div>
        </div>

        {/* Team List */}
        <div className="space-y-4">
          {teams.map((team) => {
            const percent = Math.min(100, Math.round((team.currentBalance / team.escrowTarget) * 100))
            const isComplete = team.currentBalance >= team.escrowTarget
            
            return (
              <div key={team.teamId} className={`glass-card p-4 border-l-4 ${isComplete ? 'border-green-500' : 'border-yellow-500'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{team.teamName}</h3>
                    <p className="text-white/50 text-sm flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {team.playersPaid}/{team.playersTotal} players paid
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isComplete ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Confirmed</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> In Progress</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">${team.currentBalance.toLocaleString()}</span>
                    <span className="text-white/70">${team.escrowTarget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-cyan-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-white/50 mt-1">{percent}%</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => makePayment(team.teamId)}
                    disabled={processing === team.teamId || isComplete}
                    className="btn-primary py-2 px-4 flex items-center gap-2 flex-1"
                  >
                    {processing === team.teamId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {isComplete ? 'Fully Paid' : 'Record Payment'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            <strong>How Escrow Works:</strong> Each player pays their share toward the team's escrow target. 
            When all players have paid and the target is reached, the team is confirmed for scheduling.
            Captains can pay for their team or individual players can pay directly.
          </p>
        </div>
      </div>
    </div>
  )
}
