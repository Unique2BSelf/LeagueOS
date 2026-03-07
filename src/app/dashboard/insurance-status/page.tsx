'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, Loader2, Shield } from 'lucide-react'

type InsuranceResponse = {
  hasActiveInsurance: boolean
  activePolicy: {
    id: string
    provider: string
    startDate: string
    endDate: string
    cost: number
  } | null
  daysUntilExpiry: number | null
  isExpired: boolean
  isExpiringSoon: boolean
}

export default function InsuranceStatusPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [insurance, setInsurance] = useState<InsuranceResponse | null>(null)
  const [returnedFromCheckout, setReturnedFromCheckout] = useState(false)

  const fetchInsurance = async () => {
    const response = await fetch('/api/insurance', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Failed to load insurance status')
    }
    const data = await response.json()
    setInsurance(data)
    return data as InsuranceResponse
  }

  useEffect(() => {
    fetchInsurance()
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : 'Failed to load insurance status'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const paymentState = params.get('payment')

    if (paymentState !== 'success' || !sessionId) {
      return
    }

    setReturnedFromCheckout(true)
    setSaving(true)
    setError(null)
    setMessage(null)

    const finalizeReturnedCheckout = async () => {
      try {
        const currentInsurance = await fetchInsurance()
        if (currentInsurance.hasActiveInsurance) {
          setMessage('Annual insurance is now active. You can register for seasons.')
          return
        }

        const response = await fetch('/api/payments/checkout/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId }),
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to finalize insurance payment')
        }

        const refreshedInsurance = await fetchInsurance()
        if (refreshedInsurance.hasActiveInsurance) {
          setMessage('Annual insurance is now active. You can register for seasons.')
          return
        }

        throw new Error('Insurance payment completed, but coverage is not active yet')
      } catch (finalizeError) {
        try {
          const currentInsurance = await fetchInsurance()
          if (currentInsurance.hasActiveInsurance) {
            setMessage('Annual insurance is now active. You can register for seasons.')
            return
          }
        } catch {
          // Preserve the original completion error below.
        }

        setError(finalizeError instanceof Error ? finalizeError.message : 'Failed to finalize insurance payment')
      } finally {
        setSaving(false)
        const cleanUrl = `${window.location.pathname}`
        window.history.replaceState({}, '', cleanUrl)
      }
    }

    void finalizeReturnedCheckout()
  }, [])

  useEffect(() => {
    if (!returnedFromCheckout || !insurance?.hasActiveInsurance) {
      return
    }

    setError(null)
    setMessage('Annual insurance is now active. You can register for seasons.')
  }, [returnedFromCheckout, insurance])

  const handlePurchaseInsurance = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'LEAGUE_PROVIDED', cost: 50 }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase insurance')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      throw new Error(data.message || 'Insurance checkout URL missing')
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : 'Failed to purchase insurance')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const requiresAttention = !insurance?.hasActiveInsurance

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_42%),linear-gradient(135deg,rgba(8,15,28,0.96),rgba(15,23,42,0.92))] p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-cyan-300/65">Player Eligibility</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Annual Insurance</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Active annual insurance is required before you can register for any season.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            requiresAttention
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
          }`}>
            {requiresAttention ? 'Registration Blocked' : 'Insurance Active'}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {requiresAttention ? (
        <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 text-red-300" />
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">You cannot register for any season yet</h2>
              <p className="text-sm leading-6 text-red-100/85">
                Buy your annual insurance first. Once it is active, season registration is unlocked automatically.
              </p>
              <button
                onClick={handlePurchaseInsurance}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-red-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {saving ? 'Purchasing...' : 'Buy Annual Insurance ($50)'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/10 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-6 w-6 text-emerald-300" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">You are cleared to register</h2>
              <p className="text-sm leading-6 text-emerald-100/85">
                Policy active through{' '}
                <span className="font-semibold text-white">
                  {insurance?.activePolicy?.endDate ? new Date(insurance.activePolicy.endDate).toLocaleDateString() : 'unknown'}
                </span>
                .
              </p>
              <Link
                href="/dashboard/registrations"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100"
              >
                Go To Season Registration
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
