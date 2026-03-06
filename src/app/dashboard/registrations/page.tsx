'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, Calendar, Check, Loader2, AlertCircle, X } from 'lucide-react'
import PaymentForm from '@/components/PaymentForm'
import { getAuthHeaders, getStoredUser, type StoredUser } from '@/lib/client-auth'

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
  const [user, setUser] = useState<StoredUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [registering, setRegistering] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payingRegistration, setPayingRegistration] = useState<Registration | null>(null)
  const [payingSeason, setPayingSeason] = useState<Season | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insuranceLoading, setInsuranceLoading] = useState(false)

  useEffect(() => {
    const storedUser = getStoredUser()
    setUser(storedUser)

    if (!storedUser) {
      setLoading(false)
      return
    }

    Promise.all([fetchSeasons(), fetchRegistrations()]).finally(() => setLoading(false))
  }, [])

  const fetchSeasons = async () => {
    const res = await fetch('/api/seasons')
    if (!res.ok) {
      return
    }

    const data = await res.json()
    const activeSeasons = data
      .filter((season: any) => !season.isArchived)
      .map((season: any) => ({
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        registrationFee: 150,
        insuranceRequired: true,
        status: 'OPEN',
        spots: Math.max(0, season.maxRosterSize - Number(season.teams || 0) * 10),
        totalSpots: season.maxRosterSize,
      }))

    setSeasons(activeSeasons)
  }

  const fetchRegistrations = async () => {
    const res = await fetch('/api/registrations', {
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      return
    }

    const data = await res.json()
    setRegistrations(data)
  }

  const handleRegister = async (seasonId: string) => {
    setRegistering(seasonId)
    setError(null)

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ seasonId, waiverAgreed: true }),
      })

      const reg = await res.json()
      if (!res.ok) {
        throw new Error(reg.error || 'Failed to register')
      }

      const newReg: Registration = {
        id: reg.id,
        seasonId: reg.seasonId,
        userId: reg.userId,
        status: reg.status,
        paid: reg.paid,
        amount: reg.amount,
        createdAt: reg.createdAt,
      }

      setRegistrations((current) => [newReg, ...current])

      if (!reg.paid) {
        const season = seasons.find((item) => item.id === seasonId) || null
        setPayingRegistration(newReg)
        setPayingSeason(season)
        setShowPaymentModal(true)
      }
    } catch (error) {
      console.error('Failed to register:', error)
      setError(error instanceof Error ? error.message : 'Failed to register')
    } finally {
      setRegistering(null)
    }
  }

  const handlePurchaseInsurance = async () => {
    setInsuranceLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ provider: 'LEAGUE_PROVIDED', cost: 50 }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purchase insurance')
      }

      setError('Insurance purchased successfully. You can register now.')
    } catch (purchaseError) {
      console.error('Failed to purchase insurance:', purchaseError)
      setError(purchaseError instanceof Error ? purchaseError.message : 'Failed to purchase insurance')
    } finally {
      setInsuranceLoading(false)
    }
  }

  const handlePayNow = (registration: Registration) => {
    const season = seasons.find((item) => item.id === registration.seasonId) || null
    setPayingRegistration(registration)
    setPayingSeason(season)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    setRegistrations((current) =>
      current.map((registration) =>
        registration.id === payingRegistration?.id
          ? { ...registration, paid: true, status: 'APPROVED' }
          : registration
      )
    )
    setShowPaymentModal(false)
    setPayingRegistration(null)
    setPayingSeason(null)
  }

  const getRegistrationStatus = (seasonId: string) => registrations.find((registration) => registration.seasonId === seasonId)

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

  const openSeasons = seasons.filter((season) => season.status === 'OPEN')

  return (
    <div className="max-w-4xl mx-auto">
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

        {error && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error.includes('successfully')
              ? 'border-green-500/40 bg-green-500/10 text-green-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              {error.toLowerCase().includes('insurance') && !error.includes('successfully') ? (
                <button
                  onClick={handlePurchaseInsurance}
                  disabled={insuranceLoading}
                  className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-60"
                >
                  {insuranceLoading ? 'Purchasing...' : 'Buy Insurance'}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {registrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">Your Registrations</h2>
            <div className="space-y-3">
              {registrations.map((registration) => {
                const season = seasons.find((item) => item.id === registration.seasonId)
                return (
                  <div key={registration.id} className={`glass-card p-4 border-l-4 ${
                    registration.paid && registration.status === 'APPROVED' ? 'border-green-500' :
                    registration.status === 'REJECTED' ? 'border-red-500' : 'border-yellow-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{season?.name || 'Unknown Season'}</h3>
                        <p className="text-white/50 text-sm">{season?.startDate} - {season?.endDate}</p>
                        {registration.amount && (
                          <p className="text-cyan-400 text-sm font-semibold mt-1">${registration.amount.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          registration.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                          registration.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {registration.status}
                        </span>
                        {registration.status === 'PENDING' && !registration.paid && (
                          <button onClick={() => handlePayNow(registration)} className="block mt-2 btn-primary text-sm">
                            Pay Now
                          </button>
                        )}
                        {registration.paid && (
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

                <div className="flex gap-4 mb-4 text-sm">
                  {season.insuranceRequired && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      Insurance Required
                    </span>
                  )}
                </div>

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
                        <User className="w-4 h-4" />
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

