'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'

type Field = {
  id: string
  locationId: string
  name: string
  qualityScore: number
  hasLights: boolean
  surfaceType: string | null
  notes: string | null
}

type Location = {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  parkingInfo: string | null
  restroomInfo: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  fields: Field[]
}

const emptyLocationForm = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  notes: '',
  parkingInfo: '',
  restroomInfo: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
}

const emptyFieldForm = {
  name: '',
  qualityScore: '4',
  hasLights: true,
  surfaceType: '',
  notes: '',
}

function mapLink(location: Location) {
  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
}

function embedMapLink(location: Location) {
  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(location.address)}&output=embed`
}

export default function LocationsPage() {
  const { user, loading: sessionLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [editingLocationId, setEditingLocationId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locationForm, setLocationForm] = useState(emptyLocationForm)
  const [fieldForm, setFieldForm] = useState(emptyFieldForm)

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
    setSuccess('')
    try {
      const response = await fetch('/api/locations', {
        method: editingLocationId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLocationId ? { id: editingLocationId, ...locationForm } : locationForm),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save location')
      }
      setLocationForm(emptyLocationForm)
      setEditingLocationId('')
      setSuccess(`${editingLocationId ? 'Updated' : 'Created'} ${payload.name}.`)
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
    setSuccess('')
    try {
      const response = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          name: fieldForm.name,
          qualityScore: Number(fieldForm.qualityScore),
          hasLights: fieldForm.hasLights,
          surfaceType: fieldForm.surfaceType,
          notes: fieldForm.notes,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save field')
      }
      setFieldForm(emptyFieldForm)
      setSuccess(`Added ${payload.name}.`)
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
    setSuccess('')
    try {
      const response = await fetch(`/api/fields?id=${fieldId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete field')
      }
      setSuccess('Field deleted.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete field')
    } finally {
      setSaving(false)
    }
  }

  const loadSelectedLocationIntoForm = () => {
    if (!selectedLocation) return
    setLocationForm({
      name: selectedLocation.name,
      address: selectedLocation.address,
      latitude: selectedLocation.latitude?.toString() || '',
      longitude: selectedLocation.longitude?.toString() || '',
      notes: selectedLocation.notes || '',
      parkingInfo: selectedLocation.parkingInfo || '',
      restroomInfo: selectedLocation.restroomInfo || '',
      contactName: selectedLocation.contactName || '',
      contactEmail: selectedLocation.contactEmail || '',
      contactPhone: selectedLocation.contactPhone || '',
    })
    setEditingLocationId(selectedLocation.id)
    setSuccess('Loaded location details into the form for editing.')
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
        <p className="mt-1 text-white/45">Manage facilities, field details, facility amenities, and the map info players need on match day.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{editingLocationId ? 'Edit Location' : 'Add Location'}</h2>
              {editingLocationId ? (
                <button
                  onClick={() => {
                    setEditingLocationId('')
                    setLocationForm(emptyLocationForm)
                    setSuccess('Cleared location form.')
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="space-y-3">
              <input value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="Complex / Facility Name" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} placeholder="Street address" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} placeholder="Latitude (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                <input value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} placeholder="Longitude (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              </div>
              <textarea value={locationForm.notes} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} placeholder="Facility notes, arrival instructions, gate codes" className="min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <textarea value={locationForm.parkingInfo} onChange={(e) => setLocationForm({ ...locationForm, parkingInfo: e.target.value })} placeholder="Parking details" className="min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <textarea value={locationForm.restroomInfo} onChange={(e) => setLocationForm({ ...locationForm, restroomInfo: e.target.value })} placeholder="Restroom details" className="min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={locationForm.contactName} onChange={(e) => setLocationForm({ ...locationForm, contactName: e.target.value })} placeholder="Facility contact name" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                <input value={locationForm.contactPhone} onChange={(e) => setLocationForm({ ...locationForm, contactPhone: e.target.value })} placeholder="Facility contact phone" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              </div>
              <input value={locationForm.contactEmail} onChange={(e) => setLocationForm({ ...locationForm, contactEmail: e.target.value })} placeholder="Facility contact email" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <button onClick={saveLocation} disabled={saving || !locationForm.name || !locationForm.address} className="btn-primary w-full">
                {saving ? 'Saving...' : editingLocationId ? 'Update Location' : 'Create Location'}
              </button>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Locations</h2>
            <div className="space-y-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${selectedLocationId === location.id ? 'border-cyan-400/40 bg-cyan-500/10 text-white' : 'border-white/10 bg-white/5 text-white/70'}`}
                >
                  <div className="font-medium">{location.name}</div>
                  <div className="text-xs text-white/40">{location.fields.length} fields · {location.address}</div>
                </button>
              ))}
              {locations.length === 0 ? <div className="text-sm text-white/40">No locations yet.</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedLocation ? (
            <>
              <div className="glass-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedLocation.name}</h2>
                    <p className="mt-1 text-white/50">{selectedLocation.address}</p>
                    {selectedLocation.notes ? <p className="mt-3 max-w-3xl text-sm text-white/65">{selectedLocation.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={loadSelectedLocationIntoForm} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 hover:bg-white/10">
                      <RefreshCw className="mr-2 inline h-4 w-4" />
                      Edit Details
                    </button>
                    <a href={mapLink(selectedLocation)} target="_blank" rel="noreferrer" className="rounded-lg bg-cyan-500/15 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/25">
                      <MapPin className="mr-2 inline h-4 w-4" />
                      Open Map
                    </a>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Parking</div>
                    <div className="mt-2 text-sm text-white/75">{selectedLocation.parkingInfo || 'No parking details added.'}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Restrooms</div>
                    <div className="mt-2 text-sm text-white/75">{selectedLocation.restroomInfo || 'No restroom details added.'}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Facility Contact</div>
                    <div className="mt-2 space-y-1 text-sm text-white/75">
                      <div>{selectedLocation.contactName || 'No contact set.'}</div>
                      {selectedLocation.contactPhone ? <div>{selectedLocation.contactPhone}</div> : null}
                      {selectedLocation.contactEmail ? <div>{selectedLocation.contactEmail}</div> : null}
                    </div>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <iframe
                    title={`${selectedLocation.name} map`}
                    src={embedMapLink(selectedLocation)}
                    className="h-72 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-lg font-semibold text-white">Add Field</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr,0.5fr,0.7fr,auto]">
                  <input value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} placeholder="Field name" className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                  <input value={fieldForm.surfaceType} onChange={(e) => setFieldForm({ ...fieldForm, surfaceType: e.target.value })} placeholder="Surface" className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                  <input value={fieldForm.qualityScore} onChange={(e) => setFieldForm({ ...fieldForm, qualityScore: e.target.value })} type="number" min="1" max="5" className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white/80">
                    <input type="checkbox" checked={fieldForm.hasLights} onChange={(e) => setFieldForm({ ...fieldForm, hasLights: e.target.checked })} />
                    Lights
                  </label>
                  <button onClick={saveField} disabled={saving || !fieldForm.name} className="btn-primary">
                    Add Field
                  </button>
                </div>
                <textarea value={fieldForm.notes} onChange={(e) => setFieldForm({ ...fieldForm, notes: e.target.value })} placeholder="Field notes: gate, bench side, lighting issues, setup details" className="mt-3 min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white" />
              </div>

              <div className="glass-card p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Fields at this location</h3>
                <div className="space-y-2">
                  {selectedLocation.fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{field.name}</div>
                        <div className="text-xs text-white/45">Quality {field.qualityScore} · {field.hasLights ? 'Lights' : 'No lights'}{field.surfaceType ? ` · ${field.surfaceType}` : ''}</div>
                        {field.notes ? <div className="mt-1 text-xs text-white/55">{field.notes}</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={mapLink(selectedLocation)} target="_blank" rel="noreferrer" className="rounded-md bg-cyan-500/15 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/25">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button onClick={() => deleteField(field.id)} disabled={saving} className="rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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