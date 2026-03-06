'use client'

import { useState } from 'react'
import { CreditCard, DollarSign, Check, Loader2, AlertCircle, Lock, Apple, X } from 'lucide-react'
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
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\s+/g, '').replace(/[^0-9]/g, '')
    const parts = digits.match(/.{1,4}/g)
    return parts ? parts.join(' ') : ''
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length < 3) {
      return digits
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

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

      await new Promise((resolve) => setTimeout(resolve, 1200))

      const confirmRes = await fetch('/api/payments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ paymentId: data.paymentId, action: 'confirm' }),
      })

      const confirmed = await confirmRes.json()
      if (!confirmRes.ok) {
        throw new Error(confirmed.error || 'Failed to confirm payment')
      }

      setStep('success')
      setTimeout(() => onSuccess(data.paymentId), 1000)
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
        <h3 className="text-xl font-bold text-white mb-2">Processing Payment...</h3>
        <p className="text-white/60">Please wait while we process your payment.</p>
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

        <div className="space-y-4">
          <div>
            <label className="text-white/70 text-sm mb-1 block">Cardholder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="text-white/70 text-sm mb-1 block">Card Number</label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value).slice(0, 19))}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 pr-12"
                required
              />
              <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Expiry Date</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">CVC</label>
              <input
                type="text"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/40">
          <Lock className="w-4 h-4" />
          <span className="text-xs">Demo mode - no real charges</span>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-300 text-xs text-center">
          <strong>Demo Mode:</strong> Use any card number. No real charges will be made.
        </p>
      </div>
    </div>
  )
}

