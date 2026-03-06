'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessionUser } from '@/hooks/use-session-user'
import { 
  Tag, Plus, Trash2, Copy, Check, X, 
  Percent, DollarSign, Calendar, Loader2, Settings
} from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  discountType: string
  discountValue: number
  maxUses: number | null
  currentUses: number
  expiresAt: string | null
  isActive: boolean
  description: string | null
  seasonId: string | null
  createdAt: string
}

export default function DiscountsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [discounts, setDiscounts] = useState<DiscountCode[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxUses: '',
    expiresAt: '',
    description: '',
    seasonId: '',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (userLoading) {
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    if (user.role === 'ADMIN') {
      fetchDiscounts().finally(() => setLoading(false))
      return
    }

    setLoading(false)
  }, [user, userLoading])

  const fetchDiscounts = async () => {
    try {
      const res = await fetch('/api/discounts/admin')
      if (res.ok) {
        const data = await res.json()
        setDiscounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expiresAt: formData.expiresAt || null,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setDiscounts([...discounts, created])
        setShowForm(false)
        setFormData({
          code: '',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          maxUses: '',
          expiresAt: '',
          description: '',
          seasonId: '',
        })
      }
    } catch (error) {
      console.error('Failed to create discount:', error)
    }

    setSaving(false)
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/discounts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDiscounts(discounts.map(d => 
          d.id === id ? { ...d, isActive: !currentStatus } : d
        ))
      }
    } catch (error) {
      console.error('Failed to toggle discount:', error)
    }
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (user.role !== 'ADMIN') {
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
              <Tag className="w-6 h-6 text-cyan-400" />
              Discount Codes
            </h1>
            <p className="text-white/50">Create and manage promotional codes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Code
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="glass-card p-4 mb-6 border-2 border-cyan-500/30">
            <h2 className="text-lg font-bold text-white mb-4">Create Discount Code</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 mb-1">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., SUMMER20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., Summer registration discount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/70 mb-1">Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Value *</label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="0"
                    step={formData.discountType === 'PERCENTAGE' ? "1" : "0.01"}
                    max={formData.discountType === 'PERCENTAGE' ? "100" : undefined}
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Expires</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create Code
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Discount Codes List */}
        <div className="space-y-3">
          {discounts.map((discount) => (
            <div 
              key={discount.id} 
              className={`glass-card p-4 border-l-4 ${discount.isActive ? 'border-green-500' : 'border-gray-500'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    {discount.discountType === 'PERCENTAGE' ? (
                      <Percent className="w-6 h-6 text-cyan-400" />
                    ) : (
                      <DollarSign className="w-6 h-6 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold font-mono">{discount.code}</h3>
                      <button
                        onClick={() => copyCode(discount.code, discount.id)}
                        className="text-white/40 hover:text-white"
                      >
                        {copiedId === discount.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-white/50 text-sm">
                      {discount.discountType === 'PERCENTAGE' 
                        ? `${discount.discountValue}% off` 
                        : `$${discount.discountValue} off`
                      }
                      {discount.description && ` - ${discount.description}`}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-white/40">
                      <span>{discount.currentUses}/{discount.maxUses || 'âˆž'} uses</span>
                      {discount.expiresAt && (
                        <span>Expires: {new Date(discount.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(discount.id, discount.isActive)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    discount.isActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {discount.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
          {discounts.length === 0 && (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No discount codes yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

