'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  CreditCard, Plus, Search, Loader2, Gift, Users
} from 'lucide-react'

interface Team {
  id: string
  name: string
  captainCredits: number
  captainCreditUsage: number
  captain: {
    fullName: string
    email: string
  }
  season: {
    name: string
  }
}

export default function CaptainCreditsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [creditAmount, setCreditAmount] = useState(5)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      if (userData.role === 'ADMIN') {
        fetchTeams()
      }
    }
    setLoading(false)
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        // Add credits info to each team
        const teamsWithCredits = await Promise.all(
          data.map(async (team: any) => {
            try {
              const creditRes = await fetch(`/api/captain-credits?teamId=${team.id}`)
              const creditData = await creditRes.json()
              return {
                ...team,
                captainCredits: creditData?.captainCredits || 0,
                captainCreditUsage: creditData?.captainCreditUsage || 0,
              }
            } catch {
              return { ...team, captainCredits: 0, captainCreditUsage: 0 }
            }
          })
        )
        setTeams(teamsWithCredits)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const addCredits = async () => {
    if (!selectedTeam) return
    
    setAdding(true)
    try {
      const res = await fetch('/api/captain-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          amount: creditAmount,
        }),
      })

      if (res.ok) {
        // Refresh teams
        fetchTeams()
        setShowAddModal(false)
        setSelectedTeam(null)
        setCreditAmount(5)
      }
    } catch (error) {
      console.error('Failed to add credits:', error)
    }
    setAdding(false)
  }

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Admin access required</p>
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-cyan-400" />
              Captain Credits
            </h1>
            <p className="text-white/50">Manage team captain credit rewards</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40"
          />
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {filteredTeams.map((team) => {
            const available = team.captainCredits - team.captainCreditUsage
            return (
              <div key={team.id} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{team.name}</h3>
                  <p className="text-white/50 text-sm">
                    Season: {team.season?.name || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">{available}</p>
                      <p className="text-white/50 text-xs">credits available</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTeam(team)
                        setShowAddModal(true)
                      }}
                      className="btn-primary flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No teams found</p>
          </div>
        )}
      </div>

      {/* Add Credits Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
              Add Credits to {selectedTeam?.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 mb-2">Number of Credits</label>
                <select
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value={1}>1 Credit</option>
                  <option value={2}>2 Credits</option>
                  <option value={3}>3 Credits</option>
                  <option value={5}>5 Credits</option>
                  <option value={10}>10 Credits</option>
                </select>
                <p className="text-white/50 text-xs mt-2">
                  Credits can be used for free substitute players or other team benefits
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addCredits}
                  disabled={adding}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                  Add Credits
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedTeam(null)
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
