'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, DollarSign, Award, FileText, CheckCircle, AlertTriangle, MapPin, Download, TrendingUp } from 'lucide-react'

interface Job {
  id: string; homeTeam: string; awayTeam: string; scheduledAt: string; field: string; division: string; pay: number
}

interface Report {
  id: string; homeTeam: { name: string }; awayTeam: { name: string }; scheduledAt: string; homeScore: number; awayScore: number; status: string
}

interface PayoutData {
  totalEarnings: number; totalMatches: number; is1099Eligible: boolean; currentYearEarnings: number
}

interface LedgerData {
  summary: { totalMatches: number; totalMinutes: number; totalEarnings: number; attendanceRate: number }
  earningsByDivision: Record<string, number>
}

export default function RefDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'jobs' | 'reports' | 'payouts' | 'certifications'>('jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [payouts, setPayouts] = useState<PayoutData | null>(null)
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [generating1099, setGenerating1099] = useState(false)
  const [certStatus, setCertStatus] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      fetchData(userData.id)
    }
    setLoading(false)
  }, [])

  const fetchData = async (userId: string) => {
    try { const r = await fetch('/api/referee/jobs'); if (r.ok) setJobs(await r.json()) } catch {}
    try { const r = await fetch('/api/referees/reports?status=FINAL', { headers: { 'x-user-id': userId } }); if (r.ok) setReports(await r.json()) } catch {}
    try { const r = await fetch('/api/referees/payouts', { headers: { 'x-user-id': userId } }); if (r.ok) setPayouts(await r.json()) } catch {}
    try { const r = await fetch('/api/referees/ledger', { headers: { 'x-user-id': userId } }); if (r.ok) setLedger(await r.json()) } catch {}
    try { const r = await fetch('/api/referees/certifications', { headers: { 'x-user-id': userId } }); if (r.ok) setCertStatus(await r.json()) } catch {}
  }

  const generate1099 = async () => {
    setGenerating1099(true)
    try {
      const res = await fetch('/api/taxes/1099', { headers: { 'x-user-id': user?.id } })
      if (res.ok) {
        const data = await res.json()
        alert('1099 Generated for ' + data.taxYear + '\nTotal: $' + data.totalNonemployeeCompensation)
      }
    } catch { alert('Failed') }
    setGenerating1099(false)
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Link href="/login" className="btn-primary">Login</Link></div>
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-cyan-400 border-t-2 border-b-2"></div></div>

  const isCertified = certStatus?.backgroundCheckStatus === 'CLEAR'

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Referee Dashboard</h1><p className="text-white/50">Manage games, certifications, payouts</p></div>
          <Link href="/dashboard" className="text-cyan-400">Back</Link>
        </div>
      </div>

      {!isCertified && <div className="glass-card p-4 mb-6 border-yellow-500/30 border-2 bg-yellow-500/10"><div className="flex items-center gap-3"><AlertTriangle className="text-yellow-400" /><div className="flex-1"><p className="text-yellow-400">Certification Required</p><p className="text-white/60 text-sm">Upload cert to claim games</p></div><button onClick={() => setActiveTab('certifications')} className="btn-primary">Upload</button></div></div>}

      <div className="flex gap-2 mb-6">
        {[{ id: 'jobs', l: 'Jobs', i: Calendar }, { id: 'reports', l: 'Reports', i: FileText }, { id: 'payouts', l: 'Payouts', i: DollarSign }, { id: 'certifications', l: 'Certs', i: Award }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === t.id ? 'bg-cyan-500 text-black' : 'text-white/60 bg-white/5'}`}><t.i className="w-4 h-4" />{t.l}</button>
        ))}
      </div>

      {activeTab === 'jobs' && <div className="glass-card p-6"><h2 className="text-xl font-bold text-white mb-4">Available Games</h2>
        {jobs.length === 0 ? <p className="text-white/40 text-center py-8">No games</p> : <div className="space-y-4">{jobs.map(j => (
          <div key={j.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-4"><div className="text-center"><div className="text-xs text-white/40">{new Date(j.scheduledAt).toLocaleDateString()}</div><div className="text-white font-semibold">{new Date(j.scheduledAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div></div><div className="h-10 w-px bg-white/10" /><div><div className="text-white font-semibold">{j.homeTeam} vs {j.awayTeam}</div><div className="flex items-center gap-2 text-white/40 text-sm"><MapPin className="w-3 h-3" />{j.field}</div></div></div>
            <div className="flex items-center gap-4"><div className="text-green-400 font-bold">${j.pay}</div><button disabled={!isCertified} className="btn-primary disabled:opacity-50">{isCertified ? 'Claim' : 'Cert Req'}</button></div>
          </div>
        ))}</div>}</div>}

      {activeTab === 'reports' && <div className="glass-card p-6"><h2 className="text-xl font-bold text-white mb-4">My Reports ({reports.length})</h2>
        {reports.length === 0 ? <p className="text-white/40 text-center py-8">No reports</p> : <div className="space-y-3">{reports.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div><div className="text-white font-semibold">{r.homeTeam.name} {r.homeScore} - {r.awayScore} {r.awayTeam.name}</div><div className="text-white/40 text-sm">{new Date(r.scheduledAt).toLocaleDateString()}</div></div><CheckCircle className="text-green-400" />
          </div>
        ))}</div>}</div>}

      {activeTab === 'payouts' && payouts && <div className="space-y-4">
        {ledger && <div className="glass-card p-6"><h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" />Stats</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-cyan-400">{ledger.summary.totalMatches}</p><p className="text-white/50 text-sm">Games</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-green-400">{Math.round(ledger.summary.totalMinutes/60)}h</p><p className="text-white/50 text-sm">Hours</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-yellow-400">{ledger.summary.attendanceRate}%</p><p className="text-white/50 text-sm">Attendance</p></div>
            <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-purple-400">${ledger.summary.totalEarnings}</p><p className="text-white/50 text-sm">YTD</p></div>
          </div>
          {ledger.earningsByDivision && Object.keys(ledger.earningsByDivision).length > 0 && <div className="mt-4 flex gap-2 flex-wrap">{Object.entries(ledger.earningsByDivision).map(([d,a]) => <span key={d} className="px-3 py-1 bg-white/10 rounded-full text-white text-sm">{d}: ${a}</span>)}</div>}
        </div>}
        <div className="glass-card p-6"><h2 className="text-xl font-bold text-white mb-4">Payouts</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 text-center"><p className="text-3xl font-bold text-green-400">${payouts.totalEarnings}</p><p className="text-white/50 text-sm">Total</p></div>
            <div className="glass-card p-4 text-center"><p className="text-3xl font-bold text-cyan-400">{payouts.totalMatches}</p><p className="text-white/50 text-sm">Games</p></div>
            <div className="glass-card p-4 text-center"><p className={`text-3xl font-bold ${payouts.is1099Eligible ? 'text-yellow-400' : 'text-white/40'}`}>${payouts.currentYearEarnings}</p><p className="text-white/50 text-sm">YTD</p></div>
          </div>
          {payouts.is1099Eligible && <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-yellow-400 font-semibold">1099 Eligible</p><p className="text-white/60 text-sm">Over $600 - generate form</p></div><button onClick={generate1099} disabled={generating1099} className="btn-primary flex items-center gap-2"><Download className="w-4 h-4" />{generating1099 ? 'Generating...' : 'Download 1099'}</button></div></div>}
        </div>
      </div>}

      {activeTab === 'certifications' && <div className="glass-card p-6"><h2 className="text-xl font-bold text-white mb-4">Certifications</h2>
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg"><div className="flex items-center justify-between mb-2"><span className="text-white font-semibold">Background Check</span>{isCertified ? <span className="text-green-400"><CheckCircle className="w-4 h-4 inline" /> Verified</span> : <span className="text-yellow-400"><AlertTriangle className="w-4 h-4 inline" /> Pending</span>}</div><p className="text-white/40 text-sm">Required</p><input type="file" className="text-sm text-white/60 mt-2" /></div>
          <div className="p-4 bg-white/5 rounded-lg"><div className="flex items-center justify-between mb-2"><span className="text-white font-semibold">Referee Cert</span>{isCertified ? <span className="text-green-400"><CheckCircle className="w-4 h-4 inline" /> Uploaded</span> : <span className="text-yellow-400">Not uploaded</span>}</div><p className="text-white/40 text-sm">Upload cert card</p><input type="file" className="text-sm text-white/60 mt-2" /></div>
        </div>
      </div>}
    </div>
  )
}
