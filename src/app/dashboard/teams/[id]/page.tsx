'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Copy, RefreshCw, Check, Loader2, AlertCircle, ArrowLeft, Settings, Shield, TrendingUp, DollarSign, Upload, Palette, CreditCard } from 'lucide-react'

interface Team {
  id: string; name: string; captainId: string; divisionId: string; division?: { name: string }; season?: { name: string }; primaryColor: string; secondaryColor: string; currentBalance: number; escrowTarget: number; isConfirmed: boolean; inviteCode?: string | null; inviteCodeExpiry?: Date | null; jerseyColor?: string; jerseyPattern?: string; logoUrl?: string
}

interface Player {
  userId: string; status: string; joinedAt: Date; user?: { fullName: string; email: string; role: string; isInsured?: boolean; insuranceExpiry?: string; hasUnpaidFines?: boolean }
}

interface Fine {
  id: string; amount: number; description: string; type: string; status: string; createdAt: Date
}

interface TeamStats {
  totalPlayers: number; activePlayers: number; ineligiblePlayers: number; totalFines: number; attendance: number
}

export default function TeamDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [fines, setFines] = useState<Fine[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [isCaptain, setIsCaptain] = useState(false)
  const [showJerseyModal, setShowJerseyModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [jerseyForm, setJerseyForm] = useState({ jerseyColor: '', jerseyPattern: 'solid', logoUrl: '' })
  const [payForm, setPayForm] = useState({ amount: '', description: '' })

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      fetchTeamData(teamId, userData.id)
    } else {
      setLoading(false)
      setError('Please log in to view this page')
    }
  }, [teamId])

  const fetchTeamData = async (id: string, userId: string) => {
    setLoading(true)
    setError('')
    
    try {
      const teamRes = await fetch(`/api/teams/${id}`)
      if (!teamRes.ok) { setError('Team not found'); setLoading(false); return }
      
      const teamData = await teamRes.json()
      setTeam(teamData)
      setIsCaptain(teamData.captainId === userId)
      
      // Fetch players
      const playersRes = await fetch(`/api/teams/${id}/players`)
      if (playersRes.ok) {
        const playersData = await playersRes.json()
        setPlayers(playersData)
        
        // Calculate stats
        const ineligible = playersData.filter((p: Player) => !p.user?.isInsured || p.user?.hasUnpaidFines).length
        setStats({
          totalPlayers: playersData.length,
          activePlayers: playersData.filter((p: Player) => p.status === 'APPROVED').length,
          ineligiblePlayers: ineligible,
          totalFines: 0,
          attendance: 85
        })
      }
      
      // Fetch fines
      const finesRes = await fetch(`/api/teams/payments?teamId=${id}`, { headers: { 'x-user-id': userId } })
      if (finesRes.ok) {
        const finesData = await finesRes.json()
        setFines(finesData.fines || [])
        if (stats) setStats({ ...stats, totalFines: finesData.totalFines || 0 })
      }
    } catch (err) { setError('Failed to load team') }
    setLoading(false)
  }

  const copyInviteLink = () => {
    const link = `${window.location.origin}/teams/join/${team?.inviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateInviteCode = async () => {
    setInviteLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setTeam({ ...team!, inviteCode: data.code, inviteCodeExpiry: data.expiry })
      }
    } catch {}
    setInviteLoading(false)
  }

  const revokeInviteCode = async () => {
    setInviteLoading(true)
    try {
      await fetch(`/api/teams/${teamId}/invite`, { method: 'DELETE' })
      setTeam({ ...team!, inviteCode: null, inviteCodeExpiry: null })
    } catch {}
    setInviteLoading(false)
  }

  const saveJersey = async () => {
    try {
      await fetch('/api/teams/jersey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, ...jerseyForm })
      })
      setTeam({ ...team!, ...jerseyForm })
      setShowJerseyModal(false)
    } catch {}
  }

  const payFine = async () => {
    try {
      await fetch('/api/teams/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, amount: parseFloat(payForm.amount), description: payForm.description, type: 'TEAM_FEE' })
      })
      fetchTeamData(teamId, user?.id)
      setShowPayModal(false)
      setPayForm({ amount: '', description: '' })
    } catch {}
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>

  if (error) return <div className="flex items-center justify-center min-h-screen"><p className="text-red-400">{error}</p></div>

  const ineligiblePlayers = players.filter(p => !p.user?.isInsured || p.user?.hasUnpaidFines)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-cyan-400 mb-6"><ArrowLeft className="w-4 h-4" />Back to Dashboard</Link>
      
      {/* Eligibility Banner */}
      {ineligiblePlayers.length > 0 && (
        <div className="glass-card p-4 mb-6 border-2 border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-400 w-6 h-6" />
            <div>
              <p className="text-yellow-400 font-semibold">{ineligiblePlayers.length} Player(s) Ineligible</p>
              <p className="text-white/60 text-sm">Players missing insurance or have unpaid fines</p>
            </div>
            <Link href={`/dashboard/teams/${teamId}/roster`} className="btn-secondary ml-auto">View Roster</Link>
          </div>
        </div>
      )}

      {/* Team Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{team?.name}</h1>
            <p className="text-white/50">{team?.division?.name} • {team?.season?.name}</p>
          </div>
          <div className="flex gap-2">
            {isCaptain && (
              <>
                <button onClick={() => setShowJerseyModal(true)} className="btn-secondary flex items-center gap-2"><Palette className="w-4 h-4" />Jersey</button>
                <button onClick={() => setShowPayModal(true)} className="btn-secondary flex items-center gap-2"><CreditCard className="w-4 h-4" />Pay Fine</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-cyan-400">{stats.totalPlayers}</p><p className="text-white/50 text-sm">Total Players</p></div>
          <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-green-400">{stats.activePlayers}</p><p className="text-white/50 text-sm">Active</p></div>
          <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-yellow-400">{stats.ineligiblePlayers}</p><p className="text-white/50 text-sm">Ineligible</p></div>
          <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-red-400">${stats.totalFines}</p><p className="text-white/50 text-sm">Total Fines</p></div>
          <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-purple-400">{stats.attendance}%</p><p className="text-white/50 text-sm">Attendance</p></div>
        </div>
      )}

      {/* Invite Section */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Invite Players</h2>
        {team?.inviteCode ? (
          <div className="flex items-center gap-4">
            <input readOnly value={`${window.location.origin}/teams/join/${team.inviteCode}`} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
            <button onClick={copyInviteLink} className="btn-secondary">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
            <button onClick={generateInviteCode} disabled={inviteLoading} className="btn-secondary"><RefreshCw className={`w-4 h-4 ${inviteLoading ? 'animate-spin' : ''}`} /></button>
            <button onClick={revokeInviteCode} className="btn-danger">Revoke</button>
          </div>
        ) : (
          <button onClick={generateInviteCode} disabled={inviteLoading} className="btn-primary">Generate Invite Code</button>
        )}
      </div>

      {/* Roster */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Team Roster</h2>
        {players.length > 0 ? (
          <div className="space-y-2">
            {players.map(p => {
              const isEligible = p.user?.isInsured && !p.user?.hasUnpaidFines
              return (
                <div key={p.userId} className={`flex items-center justify-between p-3 rounded-lg ${!isEligible ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-cyan-400" /></div>
                    <div><p className="text-white font-medium">{p.user?.fullName}</p><p className="text-white/40 text-xs">{p.user?.email}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEligible && <AlertCircle className="text-yellow-400 w-4 h-4" />}
                    <span className={`text-xs px-2 py-1 rounded ${p.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-white/40 text-center py-8">No players</p>}
      </div>

      {/* Jersey Modal */}
      {showJerseyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Team Jersey</h3>
            <div className="space-y-4">
              <div><label className="text-white/70 text-sm">Jersey Color</label><input type="text" value={jerseyForm.jerseyColor} onChange={e => setJerseyForm({...jerseyForm, jerseyColor: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="#FF0000" /></div>
              <div><label className="text-white/70 text-sm">Pattern</label><select value={jerseyForm.jerseyPattern} onChange={e => setJerseyForm({...jerseyForm, jerseyPattern: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="solid">Solid</option><option value="stripes">Stripes</option><option value="halves">Halves</option><option value="sash">Sash</option></select></div>
              <div><label className="text-white/70 text-sm">Logo URL</label><input type="text" value={jerseyForm.logoUrl} onChange={e => setJerseyForm({...jerseyForm, logoUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="https://..." /></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowJerseyModal(false)} className="flex-1 btn-secondary">Cancel</button><button onClick={saveJersey} className="flex-1 btn-primary">Save</button></div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Pay Fine/Fee</h3>
            <div className="space-y-4">
              <div><label className="text-white/70 text-sm">Amount</label><input type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="0.00" /></div>
              <div><label className="text-white/70 text-sm">Description</label><input type="text" value={payForm.description} onChange={e => setPayForm({...payForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="What is this for?" /></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowPayModal(false)} className="flex-1 btn-secondary">Cancel</button><button onClick={payFine} className="flex-1 btn-primary">Pay</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
