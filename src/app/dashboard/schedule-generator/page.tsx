'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  location: string
}

type Location = {
  id: string
  name: string
  address?: string | null
  fields: Field[]
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

function ScheduleGeneratorPageContent() {
  const searchParams = useSearchParams()
  const { user, loading } = useSessionUser()
  const [generating, setGenerating] = useState(false)
  const [creatingSpecial, setCreatingSpecial] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [matches, setMatches] = useState<ScheduledMatch[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [formData, setFormData] = useState({
    seasonId: '',
    locationId: '',
    fieldIds: [] as string[],
    dates: '',
    gamesPerTeam: '10',
    maxGamesPerDay: '2',
    mode: 'replace' as 'replace' | 'append',
  })
  const [specialMatch, setSpecialMatch] = useState({
    homeTeamId: '',
    awayTeamId: '',
    fieldId: '',
    date: '',
    time: '18:00',
    matchType: 'FRIENDLY',
    gameLengthMinutes: '60',
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
      const [seasonsRes, fieldsRes, locationsRes] = await Promise.all([
        fetch('/api/scheduler?action=seasons'),
        fetch('/api/scheduler?action=fields'),
        fetch('/api/scheduler?action=locations'),
      ])

      const seasonsData = await seasonsRes.json()
      const fieldsData = await fieldsRes.json()
      const locationsData = await locationsRes.json()
      const availableSeasons = seasonsData.seasons || []
      const availableLocations = locationsData.locations || []

      setSeasons(availableSeasons)
      setFields(fieldsData.fields || [])
      setLocations(availableLocations)

      const requestedSeasonId = searchParams.get('seasonId')
      const initialSeasonId = availableSeasons.find((season: Season) => season.id === requestedSeasonId)?.id || availableSeasons[0]?.id || ''
      const initialLocationId = availableLocations[0]?.id || ''
      setFormData((current) => ({
        ...current,
        seasonId: current.seasonId || initialSeasonId,
        locationId: current.locationId || initialLocationId,
        fieldIds: current.fieldIds.length ? current.fieldIds : (availableLocations[0]?.fields || []).map((field: Field) => field.id),
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
    setSpecialMatch((current) => ({
      ...current,
      homeTeamId: current.homeTeamId || teamsData.teams?.[0]?.id || '',
      awayTeamId: current.awayTeamId || teamsData.teams?.[1]?.id || '',
    }))
  }

  useEffect(() => {
    const activeLocation = locations.find((location) => location.id === formData.locationId)
    const locationFields = activeLocation?.fields || []
    const nextFieldIds = formData.fieldIds.filter((fieldId) => locationFields.some((field) => field.id === fieldId))
    const defaultFieldIds = locationFields.map((field) => field.id)

    setFields(locationFields)
    setFormData((current) => ({
      ...current,
      fieldIds: nextFieldIds.length ? nextFieldIds : defaultFieldIds,
    }))
    setSpecialMatch((current) => ({
      ...current,
      fieldId: locationFields.find((field) => field.id === current.fieldId)?.id || locationFields[0]?.id || '',
    }))
  }, [formData.locationId, locations])

  const toggleField = (fieldId: string) => {
    setFormData((current) => ({
      ...current,
      fieldIds: current.fieldIds.includes(fieldId)
        ? current.fieldIds.filter((id) => id !== fieldId)
        : [...current.fieldIds, fieldId],
    }))
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
          replaceExisting: formData.mode !== 'append',
          locationId: formData.locationId || undefined,
          fieldIds: formData.fieldIds,
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
      setSuccess(`${formData.mode === 'append' ? 'Added' : 'Saved'} ${data.generatedMatches} matches for ${data.seasonName}.`)
    } catch (err) {
      console.error('Schedule generation failed:', err)
      setError(err instanceof Error ? err.message : 'Schedule generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const createSpecialMatch = async () => {
    setCreatingSpecial(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-special',
          seasonId: formData.seasonId,
          ...specialMatch,
          gameLengthMinutes: Number(specialMatch.gameLengthMinutes),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create special match')
      }

      await fetchSeasonData(formData.seasonId)
      setSuccess('Special match created and added to the season schedule.')
    } catch (err) {
      console.error('Failed to create special match:', err)
      setError(err instanceof Error ? err.message : 'Failed to create special match')
    } finally {
      setCreatingSpecial(false)
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
              <label className="block text-white/70 mb-1">Location</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="schedule-location-select"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
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

          <div className="mb-4">
            <label className="block text-white/70 mb-2">Fields To Use</label>
            <div className="grid gap-2 md:grid-cols-2" data-testid="schedule-fields-list">
              {fields.map((field) => (
                <label key={field.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={formData.fieldIds.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                  />
                  <span>{field.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-white/70 mb-2">Generation Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'replace' })}
                className={`rounded-lg px-4 py-2 text-sm ${formData.mode === 'replace' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-white/70'}`}
                data-testid="schedule-mode-replace"
              >
                Replace Existing Schedule
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'append' })}
                className={`rounded-lg px-4 py-2 text-sm ${formData.mode === 'append' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-white/70'}`}
                data-testid="schedule-mode-append"
              >
                Append / Split Season
              </button>
            </div>
          </div>

          <button
            onClick={generateSchedule}
            disabled={generating || teams.length < 2 || !formData.seasonId || formData.fieldIds.length === 0}
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

          {(teams.length < 2 || formData.fieldIds.length === 0) && (
            <p className="text-yellow-400 text-sm mt-2">
              {teams.length < 2
                ? 'Need at least 2 approved teams in this season to generate schedule'
                : 'Select at least one field to generate the schedule'}
            </p>
          )}
        </div>

        <div className="glass-card p-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Create Tournament / Special Match</h2>
          <p className="text-sm text-white/50 mb-4">
            Use this for playoffs, tournament matches, or manual end-of-season fixtures after standings are known.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Home Team</label>
              <select
                value={specialMatch.homeTeamId}
                onChange={(e) => setSpecialMatch({ ...specialMatch, homeTeamId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="special-home-team-select"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-1">Away Team</label>
              <select
                value={specialMatch.awayTeamId}
                onChange={(e) => setSpecialMatch({ ...specialMatch, awayTeamId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="special-away-team-select"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Field</label>
              <select
                value={specialMatch.fieldId}
                onChange={(e) => setSpecialMatch({ ...specialMatch, fieldId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="special-field-select"
              >
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-1">Match Type</label>
              <select
                value={specialMatch.matchType}
                onChange={(e) => setSpecialMatch({ ...specialMatch, matchType: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="special-match-type-select"
              >
                <option value="FRIENDLY">Tournament / Playoff</option>
                <option value="REGULAR">Regular</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-white/70 mb-1">Date</label>
              <input
                type="date"
                value={specialMatch.date}
                onChange={(e) => setSpecialMatch({ ...specialMatch, date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="special-date-input"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Time</label>
              <input
                type="time"
                value={specialMatch.time}
                onChange={(e) => setSpecialMatch({ ...specialMatch, time: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Length (minutes)</label>
              <input
                type="number"
                min="30"
                step="5"
                value={specialMatch.gameLengthMinutes}
                onChange={(e) => setSpecialMatch({ ...specialMatch, gameLengthMinutes: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
          <button
            onClick={createSpecialMatch}
            disabled={creatingSpecial || !specialMatch.homeTeamId || !specialMatch.awayTeamId || !specialMatch.fieldId || !specialMatch.date || specialMatch.homeTeamId === specialMatch.awayTeamId}
            className="btn-secondary flex items-center gap-2"
            data-testid="create-special-match-button"
          >
            {creatingSpecial ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Special Match
          </button>
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
              <span className="text-white/50 text-sm">
                {formData.mode === 'append'
                  ? 'Append mode keeps the current season schedule and adds additional matches.'
                  : 'Replace mode overwrites the selected season&apos;s current schedule.'}
              </span>
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

export default function ScheduleGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <ScheduleGeneratorPageContent />
    </Suspense>
  )
}
