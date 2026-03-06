'use client'

import { useState, useEffect } from 'react'
import { Search, Star, Zap, Shield, Target, Heart, HelpCircle, Users, Filter, X, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface FreeAgent {
  id: string
  fullName: string
  photoUrl: string | null
  isGoalie: boolean
  skillSpeed: number
  skillTechnical: number
  skillStamina: number
  skillTeamwork: number
  skillDefense: number
  skillAttack: number
  eloRating: number
  createdAt: string
}

interface Team {
  id: string
  name: string
}

// Helper components for icons
const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const Footprints = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16" />
    <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6-1.87 0-2.5 1.8-2.5 3.5 0 3.11 2 5.66 2 8.68V20" />
    <path d="M16 17h4" />
    <path d="M4 13h4" />
  </svg>
)

function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            star <= value ? 'fill-yellow-400 text-yellow-400' : 'fill-white/10 text-white/20'
          }`}
          width={size}
          height={size}
        />
      ))}
    </div>
  )
}

function SkillBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/50">{icon}</span>
      <span className="text-xs text-white/70">{label}:</span>
      <span className="text-xs font-mono text-cyan-400">{value}</span>
    </div>
  )
}

export default function FreeAgentsPage() {
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters
  const [search, setSearch] = useState('')
  const [minSpeed, setMinSpeed] = useState(0)
  const [minTechnical, setMinTechnical] = useState(0)
  const [minStamina, setMinStamina] = useState(0)
  const [minTeamwork, setMinTeamwork] = useState(0)
  const [minDefense, setMinDefense] = useState(0)
  const [minAttack, setMinAttack] = useState(0)
  const [showGoalieOnly, setShowGoalieOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Claim modal
  const [selectedAgent, setSelectedAgent] = useState<FreeAgent | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [rejectionNote, setRejectionNote] = useState('')
  const [claiming, setClaiming] = useState(false)

  // Fetch user's teams (captain only)
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch free agents
        const faRes = await fetch('/api/free-agents')
        const faData = await faRes.json()
        if (faRes.ok) {
          setFreeAgents(faData.freeAgents || [])
        }

        // Fetch captain's teams
        const teamsRes = await fetch('/api/teams')
        const teamsData = await teamsRes.json()
        if (teamsRes.ok && teamsData.teams) {
          setTeams(teamsData.teams)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const searchFreeAgents = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (minSpeed) params.append('minSpeed', minSpeed.toString())
      if (minTechnical) params.append('minTechnical', minTechnical.toString())
      if (minStamina) params.append('minStamina', minStamina.toString())
      if (minTeamwork) params.append('minTeamwork', minTeamwork.toString())
      if (minDefense) params.append('minDefense', minDefense.toString())
      if (minAttack) params.append('minAttack', minAttack.toString())
      if (showGoalieOnly) params.append('isGoalie', 'true')

      const res = await fetch(`/api/free-agents?${params}`)
      const data = await res.json()
      if (res.ok) {
        setFreeAgents(data.freeAgents || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setMinSpeed(0)
    setMinTechnical(0)
    setMinStamina(0)
    setMinTeamwork(0)
    setMinDefense(0)
    setMinAttack(0)
    setShowGoalieOnly(false)
    searchFreeAgents()
  }

  const claimFreeAgent = async () => {
    if (!selectedAgent || !selectedTeamId) return
    
    setClaiming(true)
    setError('')
    setSuccess('')

    try {
      // Get current user (captain)
      const userRes = await fetch('/api/auth/me')
      const userData = await userRes.json()

      const res = await fetch('/api/free-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAgent.id,
          teamId: selectedTeamId,
          captainId: userData.user?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to claim player')
      } else {
        setSuccess(`Successfully added ${selectedAgent.fullName} to your team!`)
        setSelectedAgent(null)
        setSelectedTeamId('')
        // Refresh the list
        searchFreeAgents()
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setClaiming(false)
    }
  }

  const rejectFreeAgent = async (playerId: string, note: string) => {
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/free-agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          rejectionNote: note,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reject player')
      } else {
        setSuccess(`Player rejected: ${note || 'No note provided'}`)
        setSelectedAgent(null)
        setRejectionNote('')
      }
    } catch (err) {
      setError('Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Free Agent Pool</h1>
          <p className="text-muted-foreground">Find and recruit players looking for teams</p>
        </div>
        <div className="text-sm text-white/50">
          {freeAgents.length} free agent{freeAgents.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchFreeAgents()}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none text-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-white/10 text-white/70 hover:border-white/30'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <button
            onClick={searchFreeAgents}
            disabled={searching}
            className="px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{ background: '#00F5FF', color: '#121212' }}
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Minimum Skill Requirements</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-white/50 hover:text-white"
              >
                Clear all
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {[
                { label: 'Speed', value: minSpeed, set: setMinSpeed, icon: <Zap className="w-4 h-4" /> },
                { label: 'Technical', value: minTechnical, set: setMinTechnical, icon: <HelpCircle className="w-4 h-4" /> },
                { label: 'Stamina', value: minStamina, set: setMinStamina, icon: <Heart className="w-4 h-4" /> },
                { label: 'Teamwork', value: minTeamwork, set: setMinTeamwork, icon: <UsersIcon className="w-4 h-4" /> },
                { label: 'Defense', value: minDefense, set: setMinDefense, icon: <Shield className="w-4 h-4" /> },
                { label: 'Attack', value: minAttack, set: setMinAttack, icon: <Target className="w-4 h-4" /> },
              ].map((filter) => (
                <div key={filter.label}>
                  <label className="text-xs text-white/50 mb-1 block">{filter.label}</label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.set(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value={0}>Any</option>
                    <option value={1}>1+</option>
                    <option value={2}>2+</option>
                    <option value={3}>3+</option>
                    <option value={4}>4+</option>
                    <option value={5}>5 only</option>
                  </select>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGoalieOnly}
                onChange={(e) => setShowGoalieOnly(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/5 text-cyan-400"
              />
              <span className="text-sm">Show goalies only</span>
            </label>
          </div>
        )}
      </div>

      {/* Results */}
      {freeAgents.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No free agents found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {freeAgents.map((agent) => (
            <div
              key={agent.id}
              className="glass-card rounded-xl p-5 hover:border-cyan-400/30 transition-colors"
            >
              {/* Player Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  {agent.photoUrl ? (
                    <Image
                      src={agent.photoUrl}
                      alt={agent.fullName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/50">
                      {agent.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{agent.fullName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {agent.isGoalie && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                        Goalie
                      </span>
                    )}
                    <span className="text-xs text-white/50">
                      ELO: {agent.eloRating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skill Stars */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <SkillBadge icon={<Zap className="w-3 h-3" />} label="Speed" value={agent.skillSpeed} />
                <SkillBadge icon={<HelpCircle className="w-3 h-3" />} label="Tech" value={agent.skillTechnical} />
                <SkillBadge icon={<Heart className="w-3 h-3" />} label="Stamina" value={agent.skillStamina} />
                <SkillBadge icon={<UsersIcon className="w-3 h-3" />} label="Team" value={agent.skillTeamwork} />
                <SkillBadge icon={<Shield className="w-3 h-3" />} label="Def" value={agent.skillDefense} />
                <SkillBadge icon={<Target className="w-3 h-3" />} label="Att" value={agent.skillAttack} />
              </div>

              {/* Overall Rating */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 mb-4">
                <span className="text-sm text-white/70">Overall Rating</span>
                <StarRating value={Math.round((agent.skillSpeed + agent.skillTechnical + agent.skillStamina + agent.skillTeamwork + agent.skillDefense + agent.skillAttack) / 6)} />
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedAgent(agent)}
                disabled={teams.length === 0}
                className="w-full py-2.5 rounded-lg font-medium transition-colors bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teams.length === 0 ? 'No Teams Available' : 'Add to Team'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add to Team</h2>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Agent Summary */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                {selectedAgent.photoUrl ? (
                  <Image
                    src={selectedAgent.photoUrl}
                    alt={selectedAgent.fullName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/50">
                    {selectedAgent.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{selectedAgent.fullName}</h3>
                {selectedAgent.isGoalie && (
                  <span className="text-xs text-purple-400">Goalie</span>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/50 text-green-400 text-sm mb-4">
                {success}
              </div>
            )}

            {teams.length > 0 ? (
              <>
                <label className="block text-sm font-medium mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none text-white mb-4"
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                {/* Rejection Note */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Rejection Note (optional)
                  </label>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Reason for rejection..."
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none text-white"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (rejectionNote.trim()) {
                        rejectFreeAgent(selectedAgent.id, rejectionNote)
                      }
                    }}
                    className="flex-1 py-3 rounded-lg font-medium border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="flex-1 py-3 rounded-lg font-medium border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={claimFreeAgent}
                    disabled={!selectedTeamId || claiming}
                    className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#00F5FF', color: '#121212' }}
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-white/50 mb-4">You don't have any teams to add players to.</p>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-6 py-2 rounded-lg font-medium border border-white/10 hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
