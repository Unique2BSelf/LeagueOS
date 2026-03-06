'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, Check, X, Loader2, Search, Filter, 
  CheckCircle, XCircle, Clock, AlertTriangle, Mail, ChevronDown
} from 'lucide-react'

interface User {
  id: string
  fullName: string
  email: string
  photoUrl: string | null
  isInsured: boolean
}

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface Registration {
  id: string
  userId: string
  seasonId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  paid: boolean
  amount: number
  insuranceStatus: string
  createdAt: string
  user: User
  season: Season
}

export default function RegistrationApprovalPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [filteredRegs, setFilteredRegs] = useState<Registration[]>([])
  const [processing, setProcessing] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pendingAction, setPendingAction] = useState<{ ids: string[], action: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      if (userData.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchRegistrations()
    } else {
      router.push('/login')
    }
    setLoading(false)
  }, [])

  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/admin/registrations?status=PENDING')
      if (res.ok) {
        const data = await res.json()
        setRegistrations(data)
        setFilteredRegs(data)
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error)
    }
  }

  useEffect(() => {
    let filtered = registrations
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.season.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }
    
    setFilteredRegs(filtered)
  }, [searchTerm, statusFilter, registrations])

  const handleBulkAction = async (action: 'APPROVE' | 'REJECT', ids?: string[]) => {
    const targetIds = ids || selectedIds
    if (targetIds.length === 0) return

    if (action === 'REJECT' && !rejectReason && !ids) {
      setPendingAction({ ids: targetIds, action })
      setShowRejectModal(true)
      return
    }

    setProcessing(prev => [...prev, ...targetIds])
    
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          registrationIds: targetIds, 
          action,
          rejectionReason: action === 'REJECT' ? rejectReason : null 
        }),
      })

      if (res.ok) {
        // Refresh the list
        await fetchRegistrations()
        setSelectedIds([])
        setRejectReason('')
        setShowRejectModal(false)
        setPendingAction(null)
      }
    } catch (error) {
      console.error('Failed to process registrations:', error)
    }

    setProcessing([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRegs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRegs.map(r => r.id))
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Admin access required</p>
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

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Registration Approvals</h1>
            <p className="text-white/50">Review and approve player registrations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold">{pendingCount} Pending</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, email, or season..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="glass-card p-3 mb-4 flex">
            <span items-center justify-between className="text-white">{selectedIds.length} selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('APPROVE')}
                disabled={processing.length > 0}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Selected
              </button>
              <button
                onClick={() => handleBulkAction('REJECT')}
                disabled={processing.length > 0}
                className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredRegs.length && filteredRegs.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="text-left p-3 text-white/60 font-medium">Player</th>
                <th className="text-left p-3 text-white/60 font-medium">Season</th>
                <th className="text-left p-3 text-white/60 font-medium">Amount</th>
                <th className="text-left p-3 text-white/60 font-medium">Insurance</th>
                <th className="text-left p-3 text-white/60 font-medium">Status</th>
                <th className="text-left p-3 text-white/60 font-medium">Date</th>
                <th className="text-left p-3 text-white/60 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegs.map((reg) => (
                <tr 
                  key={reg.id} 
                  className={`border-b border-white/5 hover:bg-white/5 ${selectedIds.includes(reg.id) ? 'bg-cyan-500/10' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(reg.id)}
                      onChange={() => toggleSelect(reg.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold">
                        {reg.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{reg.user.fullName}</p>
                        <p className="text-white/40 text-sm">{reg.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white">{reg.season.name}</td>
                  <td className="p-3 text-white">${reg.amount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      reg.user.isInsured 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {reg.user.isInsured ? 'Valid' : 'Required'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      reg.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                      reg.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {reg.status}
                    </span>
                  </td>
                  <td className="p-3 text-white/60 text-sm">
                    {new Date(reg.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {reg.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleBulkAction('APPROVE', [reg.id])}
                            disabled={processing.includes(reg.id)}
                            className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                            title="Approve"
                          >
                            {processing.includes(reg.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([reg.id])
                              setPendingAction({ ids: [reg.id], action: 'REJECT' })
                              setShowRejectModal(true)
                            }}
                            className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRegs.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No registrations found</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Reject Registration</h2>
            <p className="text-white/60 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 mb-4 h-24"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setPendingAction(null)
                  setRejectReason('')
                }}
                className="px-4 py-2 text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingAction) {
                    handleBulkAction('REJECT', pendingAction.ids)
                  }
                }}
                disabled={!rejectReason}
                className="btn-primary bg-red-500"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
