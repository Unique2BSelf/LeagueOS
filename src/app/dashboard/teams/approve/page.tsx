'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionUser } from '@/hooks/use-session-user'
import { 
  Users, Check, X, Loader2, Search, 
  CheckCircle, XCircle, Clock, Shield, Palette
} from 'lucide-react'

interface Team {
  id: string
  name: string
  captainId: string
  divisionId: string
  primaryColor: string
  secondaryColor: string
  escrowTarget: number
  currentBalance: number
  isConfirmed: boolean
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  seasonId: string
  inviteCode: string
  players: string[]
  openSlots: number
  createdAt: string
}

export default function TeamApprovalPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [processing, setProcessing] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pendingAction, setPendingAction] = useState<{ ids: string[], action: string } | null>(null)

  useEffect(() => {
    if (userLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      setLoading(false)
      return
    }

    if (user.role !== 'ADMIN') {
      router.push('/dashboard')
      setLoading(false)
      return
    }

    fetchTeams().finally(() => setLoading(false))
  }, [user, userLoading, router])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams?status=PENDING')
      if (res.ok) {
        const data = await res.json()
        setTeams(data)
        setFilteredTeams(data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  useEffect(() => {
    let filtered = teams
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.captainId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(t => t.approvalStatus === statusFilter)
    }
    
    setFilteredTeams(filtered)
  }, [searchTerm, statusFilter, teams])

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
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamIds: targetIds, 
          action,
          rejectionReason: action === 'REJECT' ? rejectReason : null 
        }),
      })

      if (res.ok) {
        // Refresh the list
        await fetchTeams()
        setSelectedIds([])
        setRejectReason('')
        setShowRejectModal(false)
        setPendingAction(null)
      }
    } catch (error) {
      console.error('Failed to process teams:', error)
    }

    setProcessing([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTeams.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTeams.map(t => t.id))
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

  const pendingCount = teams.filter(t => t.approvalStatus === 'PENDING').length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Approvals</h1>
            <p className="text-white/50">Review and approve team applications</p>
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
              placeholder="Search by team name or captain..."
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
          <div className="glass-card p-3 mb-4 flex items-center justify-between">
            <span className="text-white">{selectedIds.length} selected</span>
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

        {/* Teams Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <div 
              key={team.id} 
              className={`glass-card p-4 border-2 ${
                selectedIds.includes(team.id) ? 'border-cyan-500' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(team.id)}
                    onChange={() => toggleSelect(team.id)}
                    className="w-4 h-4"
                  />
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{team.name}</h3>
                    <p className="text-white/40 text-sm">Captain: {team.captainId.slice(0, 8)}...</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  team.approvalStatus === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                  team.approvalStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {team.approvalStatus}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">Colors:</span>
                  <div className="flex gap-1">
                    <div 
                      className="w-4 h-4 rounded border border-white/20" 
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <div 
                      className="w-4 h-4 rounded border border-white/20" 
                      style={{ backgroundColor: team.secondaryColor }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">Escrow Target:</span>
                  <span className="text-white">${team.escrowTarget}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">Slots:</span>
                  <span className="text-white">{team.openSlots} open</span>
                </div>
              </div>

              <div className="flex gap-2">
                {team.approvalStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleBulkAction('APPROVE', [team.id])}
                      disabled={processing.includes(team.id)}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-2"
                    >
                      {processing.includes(team.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIds([team.id])
                        setPendingAction({ ids: [team.id], action: 'REJECT' })
                        setShowRejectModal(true)
                      }}
                      className="px-4 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {team.approvalStatus === 'REJECTED' && team.rejectionReason && (
                <div className="mt-3 p-2 bg-red-500/10 rounded text-xs text-red-400">
                  Reason: {team.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No team applications found</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Reject Team Application</h2>
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

