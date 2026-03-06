'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessionUser } from '@/hooks/use-session-user'
import { Plus, Users, Palette, Check, Loader2 } from 'lucide-react'

const divisions = [
  { id: 'div-1', name: 'Premier', level: 1 },
  { id: 'div-2', name: 'Competitive', level: 2 },
  { id: 'div-3', name: 'Recreational', level: 3 },
]

const colors = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Orange', hex: '#FF6600' },
  { name: 'Purple', hex: '#6600FF' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Gray', hex: '#808080' },
]

export default function CreateTeamPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    divisionId: 'div-1',
    primaryColor: '#FF0000',
    secondaryColor: '#FFFFFF',
    escrowTarget: '2000',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!user) {
      setError('Please log in to create a team')
      setLoading(false)
      return
    }

    if (user.role !== 'CAPTAIN' && user.role !== 'ADMIN') {
      setError('Only captains can create teams')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          captainId: user.id,
          divisionId: formData.divisionId,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          escrowTarget: parseFloat(formData.escrowTarget),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create team')
      }

      const team = await res.json()
      router.push(`/teams/${team.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to create a team</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create New Team</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name */}
          <div>
            <label className="block text-white/70 mb-2">Team Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Division */}
          <div>
            <label className="block text-white/70 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Division *
            </label>
            <select
              value={formData.divisionId}
              onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              required
            >
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name} (Level {div.level})
                </option>
              ))}
            </select>
          </div>

          {/* Jersey Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 mb-2">
                <Palette className="inline w-4 h-4 mr-1" />
                Primary Color *
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.primaryColor === color.hex 
                        ? 'border-cyan-400 scale-110' 
                        : 'border-white/20'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/70 mb-2">
                <Palette className="inline w-4 h-4 mr-1" />
                Secondary Color *
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, secondaryColor: color.hex })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.secondaryColor === color.hex 
                        ? 'border-cyan-400 scale-110' 
                        : 'border-white/20'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card p-4">
            <p className="text-white/50 text-sm mb-3">Team Preview</p>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: formData.primaryColor, color: formData.secondaryColor }}
              >
                {formData.name ? formData.name.slice(0, 2).toUpperCase() : 'FC'}
              </div>
              <div>
                <p className="text-white font-semibold">{formData.name || 'Team Name'}</p>
                <p className="text-white/50 text-sm">
                  {divisions.find(d => d.id === formData.divisionId)?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Escrow Target */}
          <div>
            <label className="block text-white/70 mb-2">
              Escrow Target ($) *
            </label>
            <input
              type="number"
              value={formData.escrowTarget}
              onChange={(e) => setFormData({ ...formData, escrowTarget: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="2000"
              min="500"
              step="100"
              required
            />
            <p className="text-white/40 text-xs mt-1">
              Total amount needed to confirm team registration
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Creating Team...
              </>
            ) : (
              <>
                <Plus />
                Create Team
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

