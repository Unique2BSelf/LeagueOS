'use client'

import { useState } from 'react'
import { CreditCard, Check, Loader2, AlertCircle, Lock, Apple, X, ExternalLink } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client-auth'

interface PaymentFormProps {
  registrationId: string
  amount: number
  seasonName: string
  onSuccess: (paymentId: string) => void
  onCancel: () => void
}

export default function PaymentForm({ registrationId, amount, seasonName, onSuccess, onCancel }: PaymentFormProps) {
  const [method, setMethod] = useState<'CARD' | 'APPLE_PAY'>('CARD')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'card' | 'processing' | 'success'>('card')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    setStep('processing')

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ registrationId, method }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      throw new Error(data.message || 'Checkout URL missing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setStep('card')
    } finally {
      setProcessing(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
        <p className="text-white/60">Your registration for {seasonName} is confirmed.</p>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Redirecting to Stripe...</h3>
        <p className="text-white/60">Please wait while we open secure checkout.</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Complete Payment</h3>
        <button onClick={onCancel} className="text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Registration Fee</p>
            <p className="text-white font-semibold">{seasonName}</p>
          </div>
          <p className="text-2xl font-bold text-cyan-400">${amount.toFixed(2)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="text-white/70 text-sm mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('CARD')}
              className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                method === 'CARD'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setMethod('APPLE_PAY')}
              className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                method === 'APPLE_PAY'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              <Apple className="w-5 h-5" />
              Apple Pay
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          <p className="font-medium text-cyan-200">Hosted Stripe Checkout</p>
          <p className="mt-1 text-cyan-100/80">
            You will be redirected to Stripe to complete this payment securely. Registration status updates after Stripe confirms the session.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/40">
          <Lock className="w-4 h-4" />
          <span className="text-xs">Secure checkout via Stripe</span>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Continue to Stripe
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-300 text-xs text-center">
          <strong>Sandbox:</strong> This dev environment uses your Stripe test account.
        </p>
      </div>
    </div>
  )
}
