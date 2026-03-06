'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  DollarSign, Plus, Search, Loader2, CreditCard, CheckCircle
} from 'lucide-react'

interface User {
  id: string
  fullName: string
  email: string
}

interface Registration {
  id: string
  userId: string
  seasonId: string
  status: string
  paid: boolean
  user: User
}

export default function ManualPaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      if (userData.role === 'ADMIN') {
        fetchPendingRegistrations()
      }
    }
    setLoading(false)
  }, [])

  const fetchPendingRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations/admin')
      if (res.ok) {
        const data = await res.json()
        // Filter for unpaid registrations
        const unpaid = (data.registrations || []).filter((r: Registration) => !r.paid)
        setRegistrations(unpaid)
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  const recordPayment = async () => {
    if (!selectedReg) return
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: selectedReg.id,
          userId: selectedReg.userId,
          amount: parseFloat(amount),
          paymentMethod,
          notes,
        }),
      })

      if (res.ok) {
        setSuccess('Payment recorded successfully!')
        setShowModal(false)
        setSelectedReg(null)
        setAmount('')
        setNotes('')
        fetchPendingRegistrations()
      }
    } catch (error) {
      console.error('Failed to record payment:', error)
    }
    setSubmitting(false)
  }

  const filteredRegs = registrations.filter(r => 
    r.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Admin access required</p>
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
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-cyan-400" />
              Manual Payments
            </h1>
            <p className="text-white/50">Record cash/Venmo payments for registrations</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40"
          />
        </div>

        {/* Unpaid Registrations */}
        <div className="space-y-3">
          {filteredRegs.map((reg) => (
            <div key={reg.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{reg.user.fullName}</h3>
                <p className="text-white/50 text-sm">{reg.user.email}</p>
                <p className="text-white/40 text-xs">Season: {reg.seasonId}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400">
                  Unpaid
                </span>
                <button
                  onClick={() => {
                    setSelectedReg(reg)
                    setAmount('150')
                    setShowModal(true)
                  }}
                  className="btn-primary flex items-center gap-1"
                >
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRegs.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white/40">All registrations are paid!</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
              Record Payment - {selectedReg?.user.fullName}
            </h2>
            
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/50 text-green-400 text-sm mb-4">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="VENMO">Venmo</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white/70 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={recordPayment}
                  disabled={submitting || !amount}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Record Payment
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedReg(null)
                    setSuccess('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
