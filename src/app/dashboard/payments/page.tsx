'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, CreditCard, CheckCircle, Clock, AlertCircle, Loader2, Receipt } from 'lucide-react'
import PaymentForm from '@/components/PaymentForm'
import { useSessionUser } from '@/hooks/use-session-user'

interface RegistrationRecord {
  id: string
  seasonId: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  paid: boolean
  amount: number
  createdAt: string
  season?: {
    id: string
    name: string
    startDate: string
    endDate: string | null
  }
}

interface PaymentRecord {
  id: string
  registrationId: string
  amount: number
  method: string
  status: string
  transactionType: string
  notes?: string | null
  updatedAt: string
  registration?: {
    seasonName?: string
  }
}

interface FineRecord {
  id: string
  amount: number
  status: string
  description?: string
  createdAt: string
}

export default function PaymentsPage() {
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [fines, setFines] = useState<FineRecord[]>([])
  const [payingRegistration, setPayingRegistration] = useState<RegistrationRecord | null>(null)
  const [payingFine, setPayingFine] = useState<FineRecord | null>(null)

  const fetchRegistrations = async () => {
    const res = await fetch('/api/registrations', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    setRegistrations(data)
  }

  const fetchPayments = async () => {
    const res = await fetch('/api/payments', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    setPayments(data)
  }

  const fetchFines = async () => {
    const res = await fetch('/api/ledger?type=FINE', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    setFines(data)
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    Promise.all([fetchRegistrations(), fetchPayments(), fetchFines()]).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const paymentState = params.get('payment')

    if (paymentState !== 'success' || !sessionId) {
      return
    }

    fetch('/api/payments/checkout/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionId }),
    })
      .then(() => Promise.all([fetchRegistrations(), fetchPayments(), fetchFines()]))
      .catch((error) => console.error('Failed to finalize checkout:', error))
  }, [user])

  const handlePaymentSuccess = async () => {
    setPayingRegistration(null)
    setPayingFine(null)
    await Promise.all([fetchRegistrations(), fetchPayments(), fetchFines()])
  }

  const stats = useMemo(() => {
    const completedPayments = payments.filter((payment) => payment.status === 'COMPLETED')
    return {
      totalPaid: completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pendingCount: registrations.filter((registration) => !registration.paid && registration.status !== 'REJECTED').length,
      outstandingAmount: registrations
        .filter((registration) => !registration.paid && registration.status !== 'REJECTED')
        .reduce((sum, registration) => sum + Number(registration.amount || 0), 0),
    }
  }, [payments, registrations])

  if (!user && !userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to view payments</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {payingRegistration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <PaymentForm
              registrationId={payingRegistration.id}
              amount={payingRegistration.amount}
              seasonName={payingRegistration.season?.name || 'Registration'}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setPayingRegistration(null)}
            />
          </div>
        </div>
      )}
      {payingFine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <PaymentForm
              ledgerEntryId={payingFine.id}
              amount={Number(payingFine.amount)}
              seasonName={payingFine.description || 'Disciplinary Fine'}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setPayingFine(null)}
            />
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">My Payments</h1>
        <p className="text-white/50 mb-6">Track your registration balances and completed payments.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">${stats.totalPaid.toFixed(2)}</p>
            <p className="text-white/50 text-sm">Completed Payments</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingCount}</p>
            <p className="text-white/50 text-sm">Open Balances</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">${stats.outstandingAmount.toFixed(2)}</p>
            <p className="text-white/50 text-sm">Outstanding Amount</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Disciplinary Fines</h2>
          <div className="space-y-3">
            {fines.map((fine) => (
              <div key={fine.id} className="glass-card p-4 border-l-4 border-red-500/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold">{fine.description || 'Disciplinary Fine'}</h3>
                    <p className="text-white/50 text-sm">
                      {new Date(fine.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-400">${Number(fine.amount).toFixed(2)}</p>
                    <p className={`text-sm ${fine.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {fine.status}
                    </p>
                    {fine.status !== 'PAID' && (
                      <button onClick={() => setPayingFine(fine)} className="mt-2 btn-primary text-sm inline-flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Pay Fine
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {fines.length === 0 && (
              <div className="text-center py-8 text-white/40">No disciplinary fines.</div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Registration Balances</h2>
          <div className="space-y-3">
            {registrations.map((registration) => {
              const canPay = !registration.paid && registration.status !== 'REJECTED'
              return (
                <div key={registration.id} className="glass-card p-4 border-l-4 border-white/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold">{registration.season?.name || 'Registration'}</h3>
                      <p className="text-white/50 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {registration.season?.startDate ? new Date(registration.season.startDate).toLocaleDateString() : 'Unknown start'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-cyan-400">${registration.amount.toFixed(2)}</p>
                      <p className={`text-sm ${registration.paid ? 'text-green-400' : registration.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {registration.paid ? 'Paid' : registration.status}
                      </p>
                      {canPay && (
                        <button onClick={() => setPayingRegistration(registration)} className="mt-2 btn-primary text-sm inline-flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {registrations.length === 0 && (
              <div className="text-center py-8 text-white/40">No registrations yet.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-3">Payment History</h2>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {payment.transactionType === 'INSURANCE'
                          ? 'Annual Insurance'
                          : payment.registration?.seasonName || 'Registration Payment'}
                      </p>
                      <p className="text-white/50 text-sm">{new Date(payment.updatedAt).toLocaleString()} via {payment.method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${Number(payment.amount).toFixed(2)}</p>
                    <span className={`text-sm inline-flex items-center gap-1 ${payment.status === 'COMPLETED' ? 'text-green-400' : payment.status === 'FAILED' ? 'text-red-400' : payment.status === 'REFUNDED' ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {payment.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4" /> : payment.status === 'FAILED' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      {payment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-8 text-white/40">No payment history yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
