'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

type RulesDocument = {
  seasonId: string
  title: string
  summary: string | null
  content: string
  effectiveDate: string | null
  season: {
    id: string
    name: string
  }
} | null

export default function SeasonRulesEditorPage() {
  const params = useParams()
  const seasonId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [document, setDocument] = useState<RulesDocument>(null)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    effectiveDate: '',
  })

  const loadRules = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/rules?seasonId=${seasonId}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load rules')
      }

      const nextDocument = payload.document as RulesDocument
      setDocument(nextDocument)
      setFormData({
        title: nextDocument?.title || `League Rules - ${nextDocument?.season?.name || ''}`.trim(),
        summary: nextDocument?.summary || '',
        content: nextDocument?.content || '',
        effectiveDate: nextDocument?.effectiveDate ? new Date(nextDocument.effectiveDate).toISOString().split('T')[0] : '',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRules()
  }, [seasonId])

  const saveRules = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/rules', {
        method: document ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          ...formData,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save rules')
      }
      setDocument(payload)
      await loadRules()
    } catch (err: any) {
      setError(err.message || 'Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/dashboard/seasons/${seasonId}`} className="mb-4 inline-flex items-center gap-2 text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to season
        </Link>
        <div className="glass-card p-6">
          <h1 className="text-2xl font-bold text-white">Season Rules Editor</h1>
          <p className="mt-1 text-white/45">Write the public rules for this season. This replaces the hardcoded rules page for the selected season.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div>}

      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-white/70">Title</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/70">Summary</label>
          <input
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Short public summary shown above the rules"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/70">Effective Date</label>
          <input
            type="date"
            value={formData.effectiveDate}
            onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-white/70">Rules Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="min-h-[420px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder={`Use headings and bullets in plain text.\n\nExample:\n1. General Conduct\n- All players must register...\n- Alcohol is prohibited...`}
          />
        </div>
        <button
          onClick={saveRules}
          disabled={saving || !formData.title.trim() || !formData.content.trim()}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {document ? 'Update Rules' : 'Publish Rules'}
        </button>
      </div>
    </div>
  )
}
