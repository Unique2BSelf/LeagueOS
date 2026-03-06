'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Loader2, Play, AlertTriangle, Save, Users, Clock, MapPin, Trophy } from 'lucide-react'

interface Team {
  id: string
  name: string
  divisionLevel: number
  qualityScore: number
}

interface Field {
  id: string
  name: string
  location: string
}

interface Location {
  id: string
  name: string
  address: string
  fields: Field[]
}

interface Ref {
  id: string
  fullName: string
}

interface ScheduledMatch {
  matchId: string
  homeTeamId: string
  awayTeamId: string | null
  homeTeamName: string
  awayTeamName: string
  fieldId: string
  fieldName: string
  locationName: string
  timeSlot: string
  date: string
  matchType: string
  gameLengthMinutes: number
  refId: string | null
  refName: string | null
  status: string
}

export default function ScheduleGeneratorPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [refs, setRefs] = useState<Ref[]>([])
  const [matches, setMatches] = useState<ScheduledMatch[]>([])
  const [activeTab, setActiveTab] = useState<'generate' | 'matches' | 'refs'>('generate')
  const [formData, setFormData] = useState({
    seasonId: '',
    dates: '2026-03-08,2026-03-15,2026-03-22,2026-03-29',
    gamesPerTeam: '10',
    maxGamesPerDay: '2',
    matchType: 'REGULAR',
    gameLengthMinutes: '60',
    includeFriendlies: false,
  })
  const [refAssignments, setRefAssignments] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<any>(null)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [showLocationGroup, setShowLocationGroup] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      fetchData()
    }
    setLoading(false)
  }, [])

  const fetchData = async () => {
    const teamsRes = await fetch('/api/scheduler?action=teams')
    const teamsData = await teamsRes.json()
    setTeams(teamsData.teams || [])

    const fieldsRes = await fetch('/api/scheduler?action=fields')
    const fieldsData = await fieldsRes.json()
    setFields(fieldsData.fields || [])

    const locsRes = await fetch('/api/scheduler?action=locations')
    const locsData = await locsRes.json()
    setLocations(locsData.locations || [])

    const refsRes = await fetch('/api/scheduler?action=refs')
    const refsData = await refsRes.json()
    setRefs(refsData.refs || [])

    const matchesRes = await fetch('/api/scheduler?action=matches')
    const matchesData = await matchesRes.json()
    setMatches(matchesData.matches || [])

    const existingAssignments: Record<string, string> = {}
    matchesData.matches?.forEach((m: ScheduledMatch) => {
      if (m.refId) existingAssignments[m.matchId] = m.refId
    })
    setRefAssignments(existingAssignments)

    const statsRes = await fetch('/api/scheduler?action=stats')
    const statsData = await statsRes.json()
    setStats(statsData)
  }

  const generateSchedule = async () => {
    setGenerating(true)
    setConflicts([])
    const dates = formData.dates.split(',').map(d => d.trim())

    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          dates,
          seasonId: formData.seasonId || undefined,
          matchType: formData.matchType,
          gameLengthMinutes: parseInt(formData.gameLengthMinutes),
          includeFriendlies: formData.includeFriendlies,
        }),
      })
      const data = await res.json()
      if (data.matches) setMatches(data.matches)
      if (data.conflicts) setConflicts(data.conflicts)
      setStats({ totalMatches: data.generatedMatches, teams: data.stats?.teams, dates: data.stats?.dates })
    } catch (err) {
      console.error('Schedule generation failed:', err)
    }
    setGenerating(false)
  }

  const assignRefs = async () => {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign-refs',
          matchIds: matches.map(m => m.matchId),
          refAssignments,
        }),
      })
      const data = await res.json()
      if (data.success) alert(`Assigned ${data.updated} referees`)
    } catch (err) {
      console.error('Ref assignment failed:', err)
    }
  }

  const createFriendly = async () => {
    if (!formData.seasonId || teams.length < 1) {
      alert('Need at least a season and one team')
      return
    }
    const res = await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-special',
        homeTeamId: teams[0]?.id,
        awayTeamId: null,
        fieldId: fields[0]?.id,
        date: formData.dates.split(',')[0]?.trim(),
        time: '14:00',
        matchType: 'FRIENDLY',
        seasonId: formData.seasonId,
      }),
    })
    const data = await res.json()
    if (data.success) fetchData()
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to generate schedules</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule Generator</h1>
            <p className="text-white/50">Generate fair round-robin schedules with equity algorithm</p>
          </div>
          <Link href="/dashboard/seasons" className="btn-secondary">Manage Seasons</Link>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 rounded-lg ${activeTab === 'generate' ? 'bg-cyan-500 text-black' : 'text-white/60 hover:text-white'}`}>
            <Calendar className="w-4 h-4 inline mr-2" />Generate
          </button>
          <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 rounded-lg ${activeTab === 'matches' ? 'bg-cyan-500 text-black' : 'text-white/60 hover:text-white'}`}>
            <Trophy className="w-4 h-4 inline mr-2" />Matches ({matches.length})
          </button>
          <button onClick={() => setActiveTab('refs')} className={`px-4 py-2 rounded-lg ${activeTab === 'refs' ? 'bg-cyan-500 text-black' : 'text-white/60 hover:text-white'}`}>
            <Users className="w-4 h-4 inline mr-2" />Referees
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-cyan-400">{stats.totalMatches || 0}</p><p className="text-white/50 text-sm">Matches</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-green-400">{teams.length}</p><p className="text-white/50 text-sm">Teams</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-yellow-400">{formData.dates.split(',').length}</p><p className="text-white/50 text-sm">Game Days</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-purple-400">{fields.length}</p><p className="text-white/50 text-sm">Fields</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-orange-400">{refs.length}</p><p className="text-white/50 text-sm">Refs</p></div>
          </div>
        )}

        {activeTab === 'generate' && (
          <>
            <div className="glass-card p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5" />Fields by Location</h2>
                <button onClick={() => setShowLocationGroup(!showLocationGroup)} className="text-cyan-400 text-sm hover:underline">{showLocationGroup ? 'Hide' : 'Show'}</button>
              </div>
              {showLocationGroup && locations.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {locations.map(loc => (
                    <div key={loc.id} className="bg-white/5 rounded-lg p-3">
                      <h3 className="font-bold text-cyan-400">{loc.name}</h3>
                      <p className="text-white/50 text-xs mb-2">{loc.address}</p>
                      <div className="flex flex-wrap gap-1">
                        {loc.fields?.map(f => <span key={f.id} className="text-xs bg-white/10 px-2 py-1 rounded">{f.name}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showLocationGroup && locations.length === 0 && <p className="text-white/40 text-sm">No locations configured</p>}
            </div>

            <div className="glass-card p-4 mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Generate New Schedule</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-white/70 mb-1 text-sm">Season</label>
                  <select value={formData.seasonId} onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Select season...</option>
                    <option value="season-1">Spring 2026</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 mb-1 text-sm">Game Length</label>
                  <select value={formData.gameLengthMinutes} onChange={(e) => setFormData({ ...formData, gameLengthMinutes: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="60">60 minutes</option>
                    <option value="70">70 minutes</option>
                    <option value="80">80 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 mb-1 text-sm">Match Type</label>
                  <select value={formData.matchType} onChange={(e) => setFormData({ ...formData, matchType: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="REGULAR">Regular</option>
                    <option value="FRIENDLY">Friendly</option>
                    <option value="BYE">Bye (Practice)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 mb-1 text-sm">Max Games/Day</label>
                  <input type="number" value={formData.maxGamesPerDay} onChange={(e) => setFormData({ ...formData, maxGamesPerDay: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" min="1" max="4" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-white/70 mb-1 text-sm">Game Dates (comma-separated)</label>
                <input type="text" value={formData.dates} onChange={(e) => setFormData({ ...formData, dates: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="2026-03-08,2026-03-15" />
              </div>
              <div className="flex gap-3">
                <button onClick={generateSchedule} disabled={generating || teams.length < 2} className="btn-primary flex items-center gap-2">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Play className="w-4 h-4" />Generate Schedule</>}
                </button>
                <button onClick={createFriendly} className="btn-secondary flex items-center gap-2"><Clock className="w-4 h-4" />Add Friendly</button>
              </div>
              {teams.length < 2 && <p className="text-yellow-400 text-sm mt-2">Need at least 2 teams to generate schedule</p>}
            </div>

            {conflicts.length > 0 && (
              <div className="glass-card p-4 mb-6 border-2 border-yellow-500/30">
                <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Scheduling Conflicts</h3>
                <ul className="text-white/70 text-sm space-y-1">{conflicts.map((c, i) => <li key={i}>• {c}</li>)}</ul>
              </div>
            )}
          </>
        )}

        {activeTab === 'matches' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Scheduled Matches ({matches.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Date</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Time</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Type</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Home</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Away</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Field</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Length</th>
                </tr></thead>
                <tbody>
                  {matches.map((match, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-white text-sm">{match.date}</td>
                      <td className="py-2 px-3 text-white text-sm">{match.timeSlot}</td>
                      <td className="py-2 px-3"><span className={`text-xs px-2 py-1 rounded ${match.matchType === 'REGULAR' ? 'bg-green-500/20 text-green-400' : match.matchType === 'FRIENDLY' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{match.matchType}</span></td>
                      <td className="py-2 px-3 text-green-400 text-sm">{match.homeTeamName}</td>
                      <td className="py-2 px-3 text-red-400 text-sm">{match.awayTeamName || 'BYE'}</td>
                      <td className="py-2 px-3 text-cyan-400 text-sm"><div>{match.fieldName}</div><div className="text-white/40 text-xs">{match.locationName}</div></td>
                      <td className="py-2 px-3 text-white/70 text-sm">{match.gameLengthMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {matches.length === 0 && <div className="text-center py-12"><Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="text-white/40">No matches scheduled</p></div>}
          </div>
        )}

        {activeTab === 'refs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Assign Referees</h2>
              <button onClick={assignRefs} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Save Assignments</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Date</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Time</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Match</th>
                  <th className="text-left text-white/50 py-2 px-3 text-sm">Assign Referee</th>
                </tr></thead>
                <tbody>
                  {matches.filter(m => m.matchType === 'REGULAR').map((match, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-white text-sm">{match.date}</td>
                      <td className="py-2 px-3 text-white text-sm">{match.timeSlot}</td>
                      <td className="py-2 px-3 text-white text-sm">{match.homeTeamName} vs {match.awayTeamName}</td>
                      <td className="py-2 px-3">
                        <select value={refAssignments[match.matchId] || ''} onChange={(e) => setRefAssignments({ ...refAssignments, [match.matchId]: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm">
                          <option value="">Unassigned</option>
                          {refs.map(ref => <option key={ref.id} value={ref.id}>{ref.fullName}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {refs.length === 0 && <div className="text-center py-8"><Users className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="text-white/40">No referees available</p><p className="text-white/30 text-sm">Create users with REF role to assign</p></div>}
          </div>
        )}
      </div>
    </div>
  )
}
