'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSessionUser } from '@/hooks/use-session-user'
import { AlertCircle, Loader2, Palette, Plus, Users } from 'lucide-react'

type SeasonOption = {
  id: string
  name: string
  isArchived: boolean
  startDate: string
  endDate: string | null
}

type DivisionOption = {
  id: string
  name: string
  level: number
  seasonId: string
  seasonName: string
  teamCount: number
  playerCount: number
  minRosterSize: number
  maxRosterSize: number
}

const colors = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Orange', hex: '#FF6600' },
  { name: 'Purple', hex: '#6600FF' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Gray', hex: '#808080' },
]

function CreateTeamPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState('')
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [divisions, setDivisions] = useState<DivisionOption[]>([])
  const [formData, setFormData] = useState({
    name: '',
    seasonId: '',
    divisionId: '',
    primaryColor: '#FF0000',
    secondaryColor: '#FFFFFF',
    escrowTarget: '2000',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const seasonsRes = await fetch('/api/seasons')
        if (!seasonsRes.ok) {
          throw new Error('Failed to load seasons')
        }

        const seasonsData = await seasonsRes.json()
        const activeSeasons = (Array.isArray(seasonsData) ? seasonsData : []).filter((season) => !season.isArchived)
        setSeasons(activeSeasons)

        const requestedSeasonId = searchParams.get('seasonId')
        const defaultSeasonId =
          activeSeasons.find((season) => season.id === requestedSeasonId)?.id ||
          activeSeasons[0]?.id ||
          ''
        if (defaultSeasonId) {
          setFormData((current) => ({ ...current, seasonId: defaultSeasonId }))
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load team setup data')
      } finally {
        setBootstrapping(false)
      }
    }

    load()
  }, [searchParams])

  useEffect(() => {
    if (!formData.seasonId) {
      setDivisions([])
      setFormData((current) => ({ ...current, divisionId: '' }))
      return
    }

    const loadDivisions = async () => {
      try {
        const divisionsRes = await fetch(`/api/divisions?seasonId=${formData.seasonId}`)
        if (!divisionsRes.ok) {
          throw new Error('Failed to load divisions')
        }

        const divisionData = await divisionsRes.json()
        const nextDivisions = Array.isArray(divisionData) ? divisionData : []
        const requestedDivisionId = searchParams.get('divisionId')
        setDivisions(nextDivisions)
        setFormData((current) => ({
          ...current,
          divisionId:
            nextDivisions.find((division) => division.id === requestedDivisionId)?.id ||
            nextDivisions.find((division) => division.id === current.divisionId)?.id ||
            nextDivisions[0]?.id ||
            '',
        }))
      } catch (err: any) {
        setError(err.message || 'Failed to load divisions')
      }
    }

    loadDivisions()
  }, [formData.seasonId, searchParams])

  const selectedDivision = useMemo(
    () => divisions.find((division) => division.id === formData.divisionId) || null,
    [divisions, formData.divisionId],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!user) {
      setError('Please log in to create a team')
      setLoading(false)
      return
    }

    if (!['CAPTAIN', 'ADMIN', 'MODERATOR'].includes(user.role)) {
      setError('Only captains or admins can create teams')
      setLoading(false)
      return
    }

    if (!formData.divisionId) {
      setError('Select a valid division before creating a team')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          divisionId: formData.divisionId,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          escrowTarget: parseFloat(formData.escrowTarget),
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to create team')
      }

      router.push(`/dashboard/teams/${payload.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to create a team</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create New Team</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!seasons.length ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">No active seasons are configured.</p>
                <p className="mt-1 text-sm text-amber-100/80">
                  Admins need to create a season and at least one division before teams can be created.
                </p>
                <Link href="/dashboard/seasons" className="mt-3 inline-block text-sm underline">
                  Open season management
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/70 mb-2">Team Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                placeholder="Enter team name"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-white/70 mb-2">Season *</label>
                <select
                  value={formData.seasonId}
                  onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  data-testid="team-season-select"
                  required
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 mb-2">
                  <Users className="inline w-4 h-4 mr-1" />
                  Division *
                </label>
                <select
                  value={formData.divisionId}
                  onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  data-testid="team-division-select"
                  required
                  disabled={!divisions.length}
                >
                  {!divisions.length ? (
                    <option value="">No divisions configured</option>
                  ) : (
                    divisions.map((division) => (
                      <option key={division.id} value={division.id}>
                        {division.name} (Level {division.level})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {formData.seasonId && !divisions.length && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                No divisions exist for the selected season. Create them in{' '}
                <Link href={`/dashboard/seasons/${formData.seasonId}`} className="underline">
                  season management
                </Link>
                .
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 mb-2">
                  <Palette className="inline w-4 h-4 mr-1" />
                  Primary Color *
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.primaryColor === color.hex ? 'border-cyan-400 scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-2">
                  <Palette className="inline w-4 h-4 mr-1" />
                  Secondary Color *
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, secondaryColor: color.hex })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.secondaryColor === color.hex ? 'border-cyan-400 scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="text-white/50 text-sm mb-3">Team Preview</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: formData.primaryColor, color: formData.secondaryColor }}
                >
                  {formData.name ? formData.name.slice(0, 2).toUpperCase() : 'FC'}
                </div>
                <div>
                  <p className="text-white font-semibold">{formData.name || 'Team Name'}</p>
                  <p className="text-white/50 text-sm">
                    {selectedDivision ? `${selectedDivision.name} | ${selectedDivision.seasonName}` : 'Select a division'}
                  </p>
                  {selectedDivision && (
                    <p className="text-white/40 text-xs mt-1">
                      Roster target: {selectedDivision.minRosterSize}-{selectedDivision.maxRosterSize} players
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-white/70 mb-2">Escrow Target ($) *</label>
              <input
                type="number"
                value={formData.escrowTarget}
                onChange={(e) => setFormData({ ...formData, escrowTarget: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                placeholder="2000"
                min="500"
                step="100"
                required
              />
              <p className="text-white/40 text-xs mt-1">Total amount needed to confirm team registration</p>
            </div>

            <button
              type="submit"
              disabled={loading || !divisions.length}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating Team...
                </>
              ) : (
                <>
                  <Plus />
                  Create Team
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CreateTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <CreateTeamPageContent />
    </Suspense>
  )
}
