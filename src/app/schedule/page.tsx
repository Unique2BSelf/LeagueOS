import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import { getScheduleMatches, getSchedulerSeasons } from '@/lib/schedule'

export const metadata = {
  title: 'Schedule | League OS',
}

export const dynamic = 'force-dynamic'

function groupMatchesByDate(matches: Awaited<ReturnType<typeof getScheduleMatches>>) {
  const grouped = new Map<string, typeof matches>()

  for (const match of matches) {
    const list = grouped.get(match.date) || []
    list.push(match)
    grouped.set(match.date, list)
  }

  return [...grouped.entries()].map(([date, dayMatches]) => ({
    date,
    matches: dayMatches,
  }))
}

function formatDateHeading(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date(Date.UTC(2026, 0, 1, hours, minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ season?: string }>
}) {
  const params = (await searchParams) || {}
  const seasons = await getSchedulerSeasons()
  const selectedSeasonId = params.season || seasons[0]?.id || null
  const matches = selectedSeasonId ? await getScheduleMatches(selectedSeasonId) : []
  const grouped = groupMatchesByDate(matches)
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Match Schedule</h1>
            <p className="text-gray-400">
              {selectedSeason ? selectedSeason.name : 'No season selected'}
            </p>
          </div>

          <form action="/schedule" method="get" className="glass-card p-4">
            <label htmlFor="season" className="block text-white/70 text-sm mb-2">
              Season
            </label>
            <div className="flex gap-3 items-center">
              <select
                id="season"
                name="season"
                defaultValue={selectedSeasonId || undefined}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                data-testid="public-schedule-season-select"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary">
                View
              </button>
            </div>
          </form>
        </div>

        {grouped.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No matches scheduled yet</h2>
            <p className="text-gray-400 mb-4">
              Once an admin generates the season schedule, matches will appear here.
            </p>
            <Link href="/dashboard/schedule-generator" className="btn-primary">
              Open Schedule Generator
            </Link>
          </div>
        ) : (
          grouped.map((day) => (
            <section key={day.date} className="mb-8" data-testid="public-schedule-day">
              <h2 className="text-xl font-semibold mb-4 text-white border-b border-white/10 pb-2">
                {formatDateHeading(day.date)}
              </h2>
              <div className="space-y-3">
                {day.matches.map((match) => (
                  <div
                    key={match.matchId}
                    className="glass-card p-4 flex flex-wrap items-center justify-between gap-4"
                    data-testid="public-schedule-match"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-cyan-400 font-mono font-bold">{formatTime(match.timeSlot)}</span>
                      {match.divisionName ? (
                        <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400">{match.divisionName}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 flex-1 justify-center text-center md:text-left">
                      <span className="text-white font-medium">{match.homeTeamName}</span>
                      <span className="text-gray-500">vs</span>
                      <span className="text-white font-medium">{match.awayTeamName}</span>
                    </div>
                    <div className="text-gray-400 text-sm text-right">
                      <div className="text-cyan-400">{match.fieldName}</div>
                      <div className="flex items-center justify-end gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.locationName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
