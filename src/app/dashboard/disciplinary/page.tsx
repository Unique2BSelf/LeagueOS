'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Check, X, DollarSign, User, Calendar, Gavel, Loader2 } from 'lucide-react'

interface DisciplinaryAction {
  id: string
  userId: string
  userName: string
  matchId?: string
  matchName?: string
  cardType: 'RED' | 'YELLOW_2'
  fineAmount: number
  isPaid: boolean
  isReleased: boolean
  suspensionGames: number
  createdAt: string
}

export default function DisciplinaryPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [actions, setActions] = useState<DisciplinaryAction[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      
      // Check if admin
      if (userData.role !== 'ADMIN' && userData.role !== 'MODERATOR') {
        // Redirect or show error
      }
      
      fetchActions()
    }
    setLoading(false)
  }, [])

  const fetchActions = async () => {
    // Mock disciplinary actions
    setActions([
      { id: 'da-1', userId: 'player-1', userName: 'John Smith', matchId: 'match-101', matchName: 'FC United vs City Kickers', cardType: 'RED', fineAmount: 50, isPaid: false, isReleased: false, suspensionGames: 1, createdAt: '2026-03-01T10:00:00Z' },
      { id: 'da-2', userId: 'player-2', userName: 'Mike Johnson', matchId: 'match-102', matchName: 'Thunder FC vs Wolf Pack', cardType: 'YELLOW_2', fineAmount: 25, isPaid: true, isReleased: false, suspensionGames: 0, createdAt: '2026-02-28T14:00:00Z' },
      { id: 'da-3', userId: 'player-3', userName: 'Chris Brown', matchId: 'match-103', matchName: 'Riverside vs Apex', cardType: 'RED', fineAmount: 50, isPaid: false, isReleased: true, suspensionGames: 2, createdAt: '2026-02-25T16:00:00Z' },
    ])
  }

  const updateStatus = async (actionId: string, field: string, value: boolean) => {
    setProcessing(actionId)
    
    // Update local state
    setActions(actions.map(a => 
      a.id === actionId ? { ...a, } : a
    ))
    
    // In production: call API
    // await fetch('/ [field]: valueapi/disciplinary', { method: 'PATCH', ... })
    
    setProcessing(null)
  }

  const processPayment = async (actionId: string) => {
    setProcessing(actionId)
    
    // Simulate payment processing
    setTimeout(() => {
      setActions(actions.map(a => 
        a.id === actionId ? { ...a, isPaid: true } : a
      ))
      setProcessing(null)
    }, 1000)
  }

  const releasePlayer = async (actionId: string) => {
    setProcessing(actionId)
    
    // Simulate release
    setTimeout(() => {
      setActions(actions.map(a => 
        a.id === actionId ? { ...a, isReleased: true } : a
      ))
      setProcessing(null)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const unpaidCount = actions.filter(a => !a.isPaid).length
  const pendingRelease = actions.filter(a => a.isPaid && !a.isReleased).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Disciplinary Actions</h1>
        <p className="text-white/50 mb-6">Review red cards and manage fine payments</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{actions.length}</p>
            <p className="text-white/50 text-sm">Total Actions</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{unpaidCount}</p>
            <p className="text-white/50 text-sm">Unpaid Fines</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{pendingRelease}</p>
            <p className="text-white/50 text-sm">Pending Release</p>
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-4">
          {actions.map((action) => (
            <div 
              key={action.id} 
              className={`glass-card p-4 border-l-4 ${
                action.isPaid && action.isReleased 
                  ? 'border-green-500' 
                  : action.isPaid 
                    ? 'border-yellow-500' 
                    : 'border-red-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    action.cardType === 'RED' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${
                      action.cardType === 'RED' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{action.userName}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        action.cardType === 'RED' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {action.cardType === 'RED' ? 'Red Card' : '2nd Yellow'}
                      </span>
                    </div>
                    
                    {action.matchName && (
                      <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {action.matchName}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-green-400">
                        <DollarSign className="w-3 h-3" />
                        ${action.fineAmount} fine
                      </span>
                      {action.suspensionGames > 0 && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <Gavel className="w-3 h-3" />
                          {action.suspensionGames} game suspension
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {/* Status badges */}
                  <div className="flex gap-1">
                    <span className={`px-2 py-1 rounded text-xs ${
                      action.isPaid 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {action.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      action.isReleased 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {action.isReleased ? 'Released' : 'Locked'}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  {!action.isPaid && (
                    <button
                      onClick={() => processPayment(action.id)}
                      disabled={processing === action.id}
                      className="btn-primary py-1 px-3 text-sm flex items-center gap-1"
                    >
                      {processing === action.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <DollarSign className="w-3 h-3" />
                      )}
                      Process Payment
                    </button>
                  )}
                  
                  {action.isPaid && !action.isReleased && (
                    <button
                      onClick={() => releasePlayer(action.id)}
                      disabled={processing === action.id}
                      className="btn-primary py-1 px-3 text-sm flex items-center gap-1 bg-green-500 hover:bg-green-600"
                    >
                      {processing === action.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Release Player
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {actions.length === 0 && (
          <div className="text-center py-12">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white">No disciplinary actions</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            <strong>How it works:</strong> When a referee issues a red card, a disciplinary action is created with an automatic fine. 
            The player's account is locked until the fine is paid. Once paid, an admin must review and release the player 
            to restore their account access.
          </p>
        </div>
      </div>
    </div>
  )
}
