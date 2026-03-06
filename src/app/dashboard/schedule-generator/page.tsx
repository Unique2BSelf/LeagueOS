'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Loader2, Play, RotateCcw, AlertTriangle, CheckCircle, Save } from 'lucide-react'

interface Team {
  id: string
  name: string
  divisionLevel: number
  qualityScore: number
}

interface Field {
  id: string
  name: string
}

interface ScheduledMatch {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  fieldId: string
  fieldName: string
  timeSlot: string
  date: string
}

export default function ScheduleGeneratorPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [matches, setMatches] = useState<ScheduledMatch[]>([])
  const [formData, setFormData] = useState({
    seasonId: 'season-1',
    dates: '2026-03-08,2026-03-15,2026-03-22,2026-03-29',
    gamesPerTeam: '10',
    maxGamesPerDay: '2',
  })
  const [stats, setStats] = useState<any>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

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
    // Fetch teams
    const teamsRes = await fetch('/api/scheduler?action=teams')
    const teamsData = await teamsRes.json()
    setTeams(teamsData.teams || [])

    // Fetch fields
    const fieldsRes = await fetch('/api/scheduler?action=fields')
    const fieldsData = await fieldsRes.json()
    setFields(fieldsData.fields || [])

    // Fetch existing matches
    const matchesRes = await fetch('/api/scheduler?action=matches')
    const matchesData = await matchesRes.json()
    setMatches(matchesData.matches || [])

    // Fetch stats
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
        }),
      })

      const data = await res.json()

      if (data.matches) {
        // Get team names
        const matchesWithNames = data.matches.map((m: any) => {
          const home = teams.find(t => t.id === m.homeTeamId)
          const away = teams.find(t => t.id === m.awayTeamId)
          const field = fields.find(f => f.id === m.fieldId)
          return {
            ...m,
            homeTeamName: home?.name || m.homeTeamId,
            awayTeamName: away?.name || m.awayTeamId,
            fieldName: field?.name || m.fieldId,
          }
        })
        setMatches(matchesWithNames)
      }

      if (data.conflicts) {
        setConflicts(data.conflicts)
      }

      setStats({
        totalMatches: data.generatedMatches,
        teams: data.stats?.teams,
        dates: data.stats?.dates,
        leagueAverage: data.stats?.leagueAverage,
      })
    } catch (err) {
      console.error('Schedule generation failed:', err)
    }

    setGenerating(false)
  }

  const checkJerseyConflict = async (homeColor: string, awayColor: string, homeTeam: string, awayTeam: string) => {
    const res = await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check-jersey',
        homeColor,
        awayColor,
        homeTeam,
        awayTeam,
      }),
    })
    return res.json()
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule Generator</h1>
            <p className="text-white/50">Generate fair round-robin schedules with equity algorithm</p>
          </div>
          <Link href="/dashboard/seasons" className="btn-secondary">
            Manage Seasons
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{stats.totalMatches || 0}</p>
              <p className="text-white/50 text-sm">Matches</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{teams.length}</p>
              <p className="text-white/50 text-sm">Teams</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{formData.dates.split(',').length}</p>
              <p className="text-white/50 text-sm">Game Days</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{fields.length}</p>
              <p className="text-white/50 text-sm">Fields</p>
            </div>
          </div>
        )}

        {/* Generation Form */}
        <div className="glass-card p-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Generate New Schedule</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Season</label>
              <select
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                <option value="season-1">Spring 2026</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-1">Game Dates (comma-separated)</label>
              <input
                type="text"
                value={formData.dates}
                onChange={(e) => setFormData({ ...formData, dates: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="2026-03-08,2026-03-15"
              />
            </div>
          </div>

          <button
            onClick={generateSchedule}
            disabled={generating || teams.length < 2}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Schedule
              </>
            )}
          </button>

          {teams.length < 2 && (
            <p className="text-yellow-400 text-sm mt-2">Need at least 2 teams to generate schedule</p>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="glass-card p-4 mb-6 border-2 border-yellow-500/30">
            <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Scheduling Conflicts
            </h3>
            <ul className="text-white/70 text-sm space-y-1">
              {conflicts.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Generated Matches */}
        {matches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Generated Schedule ({matches.length} matches)</h2>
              <button className="btn-secondary flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Schedule
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/50 py-2 px-3">Date</th>
                    <th className="text-left text-white/50 py-2 px-3">Time</th>
                    <th className="text-left text-white/50 py-2 px-3">Home</th>
                    <th className="text-left text-white/50 py-2 px-3">Away</th>
                    <th className="text-left text-white/50 py-2 px-3">Field</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-white">{match.date}</td>
                      <td className="py-2 px-3 text-white">{match.timeSlot}</td>
                      <td className="py-2 px-3 text-green-400">{match.homeTeamName}</td>
                      <td className="py-2 px-3 text-red-400">{match.awayTeamName}</td>
                      <td className="py-2 px-3 text-cyan-400">{match.fieldName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {matches.length === 0 && !generating && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No schedule generated yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
