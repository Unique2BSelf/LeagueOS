'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Gavel, Loader2, Search, Shield, X } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

interface DisciplinaryAction {
  id: string
  userId: string
  userName: string
  userEmail?: string
  matchId?: string | null
  matchName?: string | null
  cardType: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  fineAmount: number
  isPaid: boolean
  isReleased: boolean
  suspensionGames: number
  notes?: string | null
  reportNotes?: string | null
  source: string
  createdAt: string
}

interface SearchUser {
  id: string
  fullName: string
  email: string
}

export default function DisciplinaryPage() {
  const { user, loading: sessionLoading } = useSessionUser()
  const [actions, setActions] = useState<DisciplinaryAction[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [manualForm, setManualForm] = useState({
    userId: '',
    cardType: 'RED',
    fineAmount: '50',
    suspensionGames: '1',
    reportNotes: '',
  })

  const fetchActions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/disciplinary', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to load disciplinary actions')
      }
      const data = await res.json()
      setActions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load disciplinary actions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
      fetchActions()
    } else if (!sessionLoading) {
      setLoading(false)
    }
  }, [user, sessionLoading])

  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR') || searchTerm.trim().length < 2) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}&limit=8`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error('Failed to search players')
        }
        const payload = await res.json()
        setSearchResults(payload.users || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to search players')
        }
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [searchTerm, user])

  const updateAction = async (actionId: string, action: 'APPROVE' | 'REJECT' | 'RELEASE', notes?: string) => {
    setProcessing(`${action}-${actionId}`)
    setError('')
    try {
      const res = await fetch('/api/disciplinary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, action, notes }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update disciplinary action')
      }
      await fetchActions()
    } catch (err: any) {
      setError(err.message || 'Failed to update disciplinary action')
    } finally {
      setProcessing(null)
    }
  }

  const submitManualAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.userId) {
      setError('Select a player first')
      return
    }

    setProcessing('manual-create')
    setError('')
    try {
      const res = await fetch('/api/disciplinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: manualForm.userId,
          cardType: manualForm.cardType,
          fineAmount: Number(manualForm.fineAmount),
          suspensionGames: Number(manualForm.suspensionGames),
          reportNotes: manualForm.reportNotes,
          source: 'MANUAL',
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to create manual disciplinary action')
      }
      setManualForm({
        userId: '',
        cardType: 'RED',
        fineAmount: '50',
        suspensionGames: '1',
        reportNotes: '',
      })
      setSearchTerm('')
      setSearchResults([])
      await fetchActions()
    } catch (err: any) {
      setError(err.message || 'Failed to create manual disciplinary action')
    } finally {
      setProcessing(null)
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-white">Moderator access required.</p>
        </div>
      </div>
    )
  }

  const reviewQueue = actions.filter((action) => action.status === 'PENDING_REVIEW')
  const openFines = actions.filter((action) => action.status === 'APPROVED' && !action.isPaid)
  const manuallyReleasable = actions.filter((action) => action.status === 'APPROVED' && action.isPaid && !action.isReleased)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Disciplinary Queue</h1>
        <p className="text-white/50">
          Referees submit cards into review. Admin or board approves the action, the fine is assigned, and players unlock automatically when the fine is paid.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{reviewQueue.length}</p>
          <p className="text-white/50 text-sm">Pending Review</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{openFines.length}</p>
          <p className="text-white/50 text-sm">Awaiting Payment</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{manuallyReleasable.length}</p>
          <p className="text-white/50 text-sm">Paid, Not Released</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Manual Entry</h2>
          </div>

          <form onSubmit={submitManualAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">Find Player</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white"
                />
              </div>
              <div className="mt-2 space-y-2">
                {searching && <div className="text-sm text-white/50">Searching...</div>}
                {searchResults.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setManualForm((current) => ({ ...current, userId: candidate.id }))
                      setSearchTerm(candidate.fullName)
                      setSearchResults([])
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      manualForm.userId === candidate.id
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                        : 'border-white/10 bg-white/5 text-white/80'
                    }`}
                  >
                    <div>{candidate.fullName}</div>
                    <div className="text-xs text-white/45">{candidate.email}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">Card Type</label>
                <select
                  value={manualForm.cardType}
                  onChange={(e) => setManualForm((current) => ({ ...current, cardType: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <option value="RED">Red Card</option>
                  <option value="YELLOW_2">Second Yellow</option>
                  <option value="CONDUCT">Conduct / Board Action</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Fine Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualForm.fineAmount}
                  onChange={(e) => setManualForm((current) => ({ ...current, fineAmount: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Suspension Games</label>
              <input
                type="number"
                min="0"
                value={manualForm.suspensionGames}
                onChange={(e) => setManualForm((current) => ({ ...current, suspensionGames: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Report Notes</label>
              <textarea
                value={manualForm.reportNotes}
                onChange={(e) => setManualForm((current) => ({ ...current, reportNotes: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Reason, context, or board notes"
              />
            </div>

            <button disabled={processing === 'manual-create'} className="btn-primary w-full">
              {processing === 'manual-create' ? 'Creating...' : 'Create Manual Action'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Review Queue</h2>
          </div>

          <div className="space-y-4">
            {actions.map((action) => (
              <div
                key={action.id}
                className={`rounded-xl border p-4 ${
                  action.status === 'PENDING_REVIEW'
                    ? 'border-yellow-500/30 bg-yellow-500/10'
                    : action.status === 'APPROVED'
                      ? 'border-cyan-500/30 bg-cyan-500/10'
                      : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{action.userName}</span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">{action.cardType}</span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">{action.status}</span>
                    </div>
                    <div className="text-sm text-white/50">
                      {action.matchName || 'Manual disciplinary entry'}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-red-300">${Number(action.fineAmount).toFixed(2)} fine</span>
                      <span className="text-orange-300">{action.suspensionGames} suspension games</span>
                      <span className={action.isPaid ? 'text-green-300' : 'text-yellow-300'}>
                        {action.isPaid ? 'Fine paid' : 'Fine unpaid'}
                      </span>
                    </div>
                    {(action.reportNotes || action.notes) && (
                      <p className="text-sm text-white/65">
                        {action.reportNotes || action.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {action.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          onClick={() => updateAction(action.id, 'APPROVE')}
                          disabled={processing === `APPROVE-${action.id}`}
                          className="rounded-md bg-green-500/20 px-3 py-2 text-sm text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                        >
                          {processing === `APPROVE-${action.id}` ? 'Approving...' : 'Approve + Assign Fine'}
                        </button>
                        <button
                          onClick={() => updateAction(action.id, 'REJECT')}
                          disabled={processing === `REJECT-${action.id}`}
                          className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {processing === `REJECT-${action.id}` ? 'Rejecting...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {action.status === 'APPROVED' && action.isPaid && !action.isReleased && (
                      <button
                        onClick={() => updateAction(action.id, 'RELEASE')}
                        disabled={processing === `RELEASE-${action.id}`}
                        className="rounded-md bg-cyan-500/20 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                      >
                        {processing === `RELEASE-${action.id}` ? 'Releasing...' : 'Manual Release'}
                      </button>
                    )}
                    {action.status === 'APPROVED' && !action.isPaid && (
                      <span className="rounded-md bg-white/10 px-3 py-2 text-sm text-white/65">
                        Waiting on player payment
                      </span>
                    )}
                    {action.isReleased && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-500/15 px-3 py-2 text-sm text-green-300">
                        <Check className="h-4 w-4" />
                        Released
                      </span>
                    )}
                    {action.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                        <X className="h-4 w-4" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {actions.length === 0 && (
              <div className="text-center py-12 text-white/40">
                No disciplinary actions yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
