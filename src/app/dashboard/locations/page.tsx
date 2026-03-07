'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

type Field = {
  id: string
  locationId: string
  name: string
  qualityScore: number
  hasLights: boolean
}

type Location = {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  fields: Field[]
}

function mapLink(location: Location) {
  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
}

export default function LocationsPage() {
  const { user, loading: sessionLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [error, setError] = useState('')
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
  })
  const [fieldForm, setFieldForm] = useState({
    name: '',
    qualityScore: '4',
    hasLights: true,
  })

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) || null,
    [locations, selectedLocationId],
  )

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/locations')
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load locations')
      }
      const nextLocations = Array.isArray(payload) ? payload : []
      setLocations(nextLocations)
      setSelectedLocationId((current) => current || nextLocations[0]?.id || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!sessionLoading) {
      void loadData()
    }
  }, [sessionLoading])

  const saveLocation = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationForm),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save location')
      }
      setLocationForm({ name: '', address: '', latitude: '', longitude: '' })
      await loadData()
      setSelectedLocationId(payload.id)
    } catch (err: any) {
      setError(err.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const saveField = async () => {
    if (!selectedLocationId) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          name: fieldForm.name,
          qualityScore: Number(fieldForm.qualityScore),
          hasLights: fieldForm.hasLights,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save field')
      }
      setFieldForm({ name: '', qualityScore: '4', hasLights: true })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  const deleteField = async (fieldId: string) => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/fields?id=${fieldId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete field')
      }
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete field')
    } finally {
      setSaving(false)
    }
  }

  if (sessionLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
  }

  if (!user || user.role !== 'ADMIN') {
    return <div className="glass-card p-6 text-white/60">Admin access required.</div>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white">Fields & Locations</h1>
        <p className="mt-1 text-white/45">Manage league facilities, field quality, and map links used by scheduling and match presentation.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Add Location</h2>
            <div className="space-y-3">
              <input value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="Complex / Facility Name" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} placeholder="Street address" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} placeholder="Latitude (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                <input value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} placeholder="Longitude (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              </div>
              <button onClick={saveLocation} disabled={saving || !locationForm.name || !locationForm.address} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Create Location'}
              </button>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Locations</h2>
            <div className="space-y-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${selectedLocationId === location.id ? 'border-cyan-400/40 bg-cyan-500/10 text-white' : 'border-white/10 bg-white/5 text-white/70'}`}
                >
                  <div className="font-medium">{location.name}</div>
                  <div className="text-xs text-white/40">{location.fields.length} fields</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedLocation ? (
            <>
              <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedLocation.name}</h2>
                    <p className="mt-1 text-white/50">{selectedLocation.address}</p>
                  </div>
                  <a href={mapLink(selectedLocation)} target="_blank" rel="noreferrer" className="rounded-lg bg-cyan-500/15 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/25">
                    <MapPin className="inline mr-2 h-4 w-4" />
                    Open Map
                  </a>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-lg font-semibold text-white">Add Field</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr,0.6fr,0.6fr,auto]">
                  <input value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} placeholder="Field name" className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                  <input value={fieldForm.qualityScore} onChange={(e) => setFieldForm({ ...fieldForm, qualityScore: e.target.value })} type="number" min="1" max="5" className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white/80">
                    <input type="checkbox" checked={fieldForm.hasLights} onChange={(e) => setFieldForm({ ...fieldForm, hasLights: e.target.checked })} />
                    Lights
                  </label>
                  <button onClick={saveField} disabled={saving || !fieldForm.name} className="btn-primary">
                    Add Field
                  </button>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Fields at this location</h3>
                <div className="space-y-2">
                  {selectedLocation.fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{field.name}</div>
                        <div className="text-xs text-white/45">Quality {field.qualityScore} · {field.hasLights ? 'Lights' : 'No lights'}</div>
                      </div>
                      <button onClick={() => deleteField(field.id)} disabled={saving} className="rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {selectedLocation.fields.length === 0 && <div className="text-sm text-white/40">No fields added to this location yet.</div>}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-6 text-white/45">Create a location to start adding fields and map links.</div>
          )}
        </div>
      </div>
    </div>
  )
}
