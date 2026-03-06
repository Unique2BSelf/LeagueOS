'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, Loader2, Play, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

type Team = {
  id: string
  name: string
  divisionId: string
  divisionLevel: number
  qualityScore: number
}

type Field = {
  id: string
  name: string
}

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
}

type ScheduledMatch = {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  fieldId: string
  fieldName: string
  timeSlot: string
  date: string
  seasonId: string
  seasonName: string
}

export default function ScheduleGeneratorPage() {
  const { user, loading } = useSessionUser()
  const [generating, setGenerating] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [matches, setMatches] = useState<ScheduledMatch[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [formData, setFormData] = useState({
    seasonId: '',
    dates: '',
    gamesPerTeam: '10',
    maxGamesPerDay: '2',
  })
  const [stats, setStats] = useState<any>(null)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = user?.role === 'ADMIN'

  const defaultDates = useMemo(() => {
    const today = new Date()
    const dates: string[] = []

    for (let i = 1; i <= 4; i += 1) {
      const next = new Date(today)
      next.setDate(today.getDate() + i * 7)
      dates.push(next.toISOString().split('T')[0])
    }

    return dates.join(',')
  }, [])

  useEffect(() => {
    if (loading || !user || !isAdmin) {
      if (!loading) {
        setDataLoading(false)
      }
      return
    }

    void fetchInitialData()
  }, [user, loading, isAdmin])

  useEffect(() => {
    if (!formData.seasonId || !user || !isAdmin) {
      return
    }

    void fetchSeasonData(formData.seasonId)
  }, [formData.seasonId, user, isAdmin])

  const fetchInitialData = async () => {
    setDataLoading(true)
    setError('')

    try {
      const [seasonsRes, fieldsRes] = await Promise.all([
        fetch('/api/scheduler?action=seasons'),
        fetch('/api/scheduler?action=fields'),
      ])

      const seasonsData = await seasonsRes.json()
      const fieldsData = await fieldsRes.json()
      const availableSeasons = seasonsData.seasons || []

      setSeasons(availableSeasons)
      setFields(fieldsData.fields || [])

      const initialSeasonId = availableSeasons[0]?.id || ''
      setFormData((current) => ({
        ...current,
        seasonId: current.seasonId || initialSeasonId,
        dates: current.dates || defaultDates,
      }))

      if (initialSeasonId) {
        await fetchSeasonData(initialSeasonId)
      }
    } catch (err) {
      console.error('Failed to load scheduler data:', err)
      setError('Failed to load schedule data')
    } finally {
      setDataLoading(false)
    }
  }

  const fetchSeasonData = async (seasonId: string) => {
    const [teamsRes, matchesRes, statsRes] = await Promise.all([
      fetch(`/api/scheduler?action=teams&seasonId=${seasonId}`),
      fetch(`/api/scheduler?action=matches&seasonId=${seasonId}`),
      fetch(`/api/scheduler?action=stats&seasonId=${seasonId}`),
    ])

    const teamsData = await teamsRes.json()
    const matchesData = await matchesRes.json()
    const statsData = await statsRes.json()

    setTeams(teamsData.teams || [])
    setMatches(matchesData.matches || [])
    setStats(statsData)
  }

  const generateSchedule = async () => {
    setGenerating(true)
    setConflicts([])
    setError('')
    setSuccess('')

    const dates = formData.dates.split(',').map((value) => value.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          seasonId: formData.seasonId,
          dates,
          gamesPerTeam: Number(formData.gamesPerTeam),
          maxGamesPerDay: Number(formData.maxGamesPerDay),
          replaceExisting: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Schedule generation failed')
      }

      setMatches(data.matches || [])
      setConflicts(data.conflicts || [])
      setStats({
        totalMatches: data.generatedMatches,
        teams: data.stats?.teams,
        dates: data.stats?.dates,
        leagueAverage: data.stats?.leagueAverage,
        totalTeams: data.stats?.teams,
        scheduledMatches: data.generatedMatches,
        totalFields: fields.length,
      })
      setSuccess(`Saved ${data.generatedMatches} matches for ${data.seasonName}.`)
    } catch (err) {
      console.error('Schedule generation failed:', err)
      setError(err instanceof Error ? err.message : 'Schedule generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
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

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-white/50">Schedule generation is restricted to admins.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule Generator</h1>
            <p className="text-white/50">Generate and persist season schedules from approved team rosters</p>
          </div>
          <Link href="/schedule" className="btn-secondary">
            View Public Schedule
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{stats.scheduledMatches || stats.totalMatches || 0}</p>
              <p className="text-white/50 text-sm">Matches</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{teams.length}</p>
              <p className="text-white/50 text-sm">Approved Teams</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{formData.dates.split(',').filter(Boolean).length}</p>
              <p className="text-white/50 text-sm">Game Days</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{fields.length}</p>
              <p className="text-white/50 text-sm">Fields</p>
            </div>
          </div>
        )}

        <div className="glass-card p-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Generate New Schedule</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Season</label>
              <select
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="schedule-season-select"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
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
                data-testid="schedule-dates-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Games Per Team</label>
              <input
                type="number"
                min="1"
                value={formData.gamesPerTeam}
                onChange={(e) => setFormData({ ...formData, gamesPerTeam: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Max Games Per Day</label>
              <input
                type="number"
                min="1"
                value={formData.maxGamesPerDay}
                onChange={(e) => setFormData({ ...formData, maxGamesPerDay: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <button
            onClick={generateSchedule}
            disabled={generating || teams.length < 2 || !formData.seasonId}
            className="btn-primary flex items-center gap-2"
            data-testid="generate-schedule-button"
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
            <p className="text-yellow-400 text-sm mt-2">Need at least 2 approved teams in this season to generate schedule</p>
          )}
        </div>

        {error && (
          <div className="glass-card p-4 mb-6 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="glass-card p-4 mb-6 border border-green-500/30 text-green-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="glass-card p-4 mb-6 border-2 border-yellow-500/30">
            <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Scheduling Conflicts
            </h3>
            <ul className="text-white/70 text-sm space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index}>- {conflict}</li>
              ))}
            </ul>
          </div>
        )}

        {matches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Persisted Schedule ({matches.length} matches)</h2>
              <span className="text-white/50 text-sm">Generation overwrites the selected season&apos;s current schedule.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="generated-schedule-table">
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
                  {matches.map((match) => (
                    <tr key={match.matchId} className="border-b border-white/5 hover:bg-white/5">
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
            <p className="text-white/40">No persisted schedule for this season yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
