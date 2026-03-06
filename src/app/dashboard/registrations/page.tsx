'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Calendar, DollarSign, Check, Loader2, CreditCard, AlertCircle, X } from 'lucide-react'
import PaymentForm from '@/components/PaymentForm'

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  registrationFee: number
  insuranceRequired: boolean
  status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS'
  spots: number
  totalSpots: number
}

interface Registration {
  id: string
  seasonId: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  paid: boolean
  amount?: number
  createdAt: string
}

export default function RegistrationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [registering, setRegistering] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payingRegistration, setPayingRegistration] = useState<Registration | null>(null)
  const [payingSeason, setPayingSeason] = useState<Season | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      fetchSeasons()
      fetchRegistrations()
    }
    setLoading(false)
  }, [])

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons')
      if (res.ok) {
        const data = await res.json()
        const activeSeasons = data.filter((s: any) => !s.isArchived).map((s: any) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          registrationFee: 150,
          insuranceRequired: true,
          status: 'OPEN',
          spots: s.maxRosterSize - (s.teams || 0) * 10,
          totalSpots: s.maxRosterSize,
        }))
        setSeasons(activeSeasons)
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error)
    }
  }

  const fetchRegistrations = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/registrations')
      if (res.ok) {
        const data = await res.json()
        setRegistrations(data)
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error)
    }
  }

  const handleRegister = async (seasonId: string) => {
    if (!user) return
    setRegistering(seasonId)

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId }),
      })

      if (res.ok) {
        const reg = await res.json()
        const newReg = {
          id: reg.id,
          seasonId: reg.seasonId,
          userId: user.id,
          status: reg.status,
          paid: reg.paid,
          amount: reg.amount,
          createdAt: reg.createdAt,
        }
        setRegistrations([...registrations, newReg])
        
        // If registration created but not paid, show payment modal
        if (!reg.paid && reg.status !== 'APPROVED') {
          const season = seasons.find(s => s.id === seasonId)
          setPayingRegistration(newReg)
          setPayingSeason(season || null)
          setShowPaymentModal(true)
        }
      }
    } catch (error) {
      console.error('Failed to register:', error)
    }

    setRegistering(null)
  }

  const handlePayNow = (reg: Registration) => {
    const season = seasons.find(s => s.id === reg.seasonId)
    setPayingRegistration(reg)
    setPayingSeason(season || null)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (paymentId: string) => {
    // Update registration in local state
    setRegistrations(registrations.map(r => 
      r.id === payingRegistration?.id 
        ? { ...r, paid: true, status: 'APPROVED' }
        : r
    ))
    setShowPaymentModal(false)
    setPayingRegistration(null)
    setPayingSeason(null)
  }

  const getRegistrationStatus = (seasonId: string) => {
    return registrations.find(r => r.seasonId === seasonId)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to register for seasons</p>
          <Link href="/login" className="btn-primary">Login</Link>
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

  const openSeasons = seasons.filter(s => s.status === 'OPEN')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Payment Modal */}
      {showPaymentModal && payingRegistration && payingSeason && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <PaymentForm
              registrationId={payingRegistration.id}
              amount={payingRegistration.amount || payingSeason.registrationFee}
              seasonName={payingSeason.name}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowPaymentModal(false)
                setPayingRegistration(null)
                setPayingSeason(null)
              }}
            />
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Season Registration</h1>
        <p className="text-white/50 mb-6">Register for upcoming seasons and pay fees</p>

        {/* Current Registrations */}
        {registrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">Your Registrations</h2>
            <div className="space-y-3">
              {registrations.map((reg) => {
                const season = seasons.find(s => s.id === reg.seasonId)
                return (
                  <div key={reg.id} className={`glass-card p-4 border-l-4 ${
                    reg.paid && reg.status === 'APPROVED' ? 'border-green-500' :
                    reg.status === 'REJECTED' ? 'border-red-500' : 'border-yellow-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{season?.name || 'Unknown Season'}</h3>
                        <p className="text-white/50 text-sm">{season?.startDate} - {season?.endDate}</p>
                        {reg.amount && (
                          <p className="text-cyan-400 text-sm font-semibold mt-1">${reg.amount.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          reg.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                          reg.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {reg.status}
                        </span>
                        {reg.status === 'PENDING' && !reg.paid && (
                          <button 
                            onClick={() => handlePayNow(reg)}
                            className="block mt-2 btn-primary text-sm"
                          >
                            Pay Now
                          </button>
                        )}
                        {reg.paid && (
                          <span className="block mt-2 text-green-400 text-sm flex items-center gap-1 justify-end">
                            <Check className="w-4 h-4" /> Paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Seasons */}
        <h2 className="text-lg font-bold text-white mb-3">Available Seasons</h2>
        <div className="space-y-4">
          {openSeasons.map((season) => {
            const existingReg = getRegistrationStatus(season.id)
            const percentFull = Math.round(((season.totalSpots - season.spots) / season.totalSpots) * 100)

            return (
              <div key={season.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{season.name}</h3>
                    <p className="text-white/50 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {season.startDate} - {season.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400">${season.registrationFee}</p>
                    <p className="text-white/50 text-xs">Registration Fee</p>
                  </div>
                </div>

                {/* Spots Available */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Spots Available</span>
                    <span className="text-white">{season.spots}/{season.totalSpots}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percentFull > 80 ? 'bg-red-500' : percentFull > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${percentFull}%` }}
                    />
                  </div>
                </div>

                {/* Requirements */}
                <div className="flex gap-4 mb-4 text-sm">
                  {season.insuranceRequired && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      Insurance Required
                    </span>
                  )}
                </div>

                {/* Action */}
                {existingReg ? (
                  <div className="text-center py-2 bg-white/5 rounded-lg">
                    {existingReg.status === 'PENDING' && !existingReg.paid ? (
                      <p className="text-yellow-400">Registration Pending - Payment Required</p>
                    ) : existingReg.status === 'PENDING' ? (
                      <p className="text-yellow-400">Registration Pending Approval</p>
                    ) : existingReg.status === 'APPROVED' ? (
                      <p className="text-green-400 flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> Registration Approved!
                      </p>
                    ) : (
                      <p className="text-red-400">Registration Rejected</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegister(season.id)}
                    disabled={registering === season.id || season.spots === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {registering === season.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registering...
                      </>
                    ) : season.spots === 0 ? (
                      <>
                        <X className="w-4 h-4" />
                        Full
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Register for ${season.registrationFee}
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {openSeasons.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No open registrations</p>
          </div>
        )}
      </div>
    </div>
  )
}
