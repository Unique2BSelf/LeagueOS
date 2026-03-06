"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Play, Pause, RotateCcw, Plus, Minus, CheckCircle, Save, FileText } from 'lucide-react';

function MatchCenterContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams?.get('id')
  
  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [yellowCards, setYellowCards] = useState({ home: 0, away: 0 })
  const [redCards, setRedCards] = useState({ home: 0, away: 0 })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklist, setChecklist] = useState({ teamsPresent: false, playersVerified: false, fieldInspected: false, weatherConfirmed: false })

  useEffect(() => {
    if (matchId) fetchMatch(matchId)
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchMatch = async (id: string) => {
    try {
      const res = await fetch(`/api/matches/${id}`)
      if (res.ok) { const data = await res.json(); setMatch(data); setHomeScore(data.homeScore||0); setAwayScore(data.awayScore||0) }
    } catch (e) { console.error(e) }
  }

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const submitReport = async () => {
    if (!match) return
    if (!Object.values(checklist).every(v=>v)) { setShowChecklist(true); return }
    setSaving(true)
    try {
      const res = await fetch('/api/referees/reports', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({matchId:match.id, homeScore, awayScore, yellowCards, redCards, notes}) })
      if (res.ok) { setSaved(true); setTimeout(()=>window.location.href='/ref/jobs',2000) }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-cyan-400 border-t-2 border-b-2"></div></div>
  if (!match) return <div className="min-h-screen flex items-center justify-center"><Link href="/ref/jobs" className="btn-primary">Back to Jobs</Link></div>

  return (
    <div style={{background:'#121212', minHeight:'100vh'}}>
      <header className="glass-card border-b border-white/10 p-4 flex justify-between">
        <Link href="/ref/jobs" className="text-cyan-400">← Back</Link>
        <span className="text-white/40">{match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString() : ''}</span>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        {saved && <div className="glass-card p-4 mb-6 border-green-500/30 border-2 bg-green-500/10"><CheckCircle className="text-green-400 inline mr-2" />Submitted!</div>}
        <h1 className="text-3xl font-bold text-white text-center mb-2">Match Center</h1>
        <p className="text-gray-400 text-center mb-8">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
        
        <div className="glass-card p-6 mb-6">
          <button onClick={()=>setShowChecklist(!showChecklist)} className="w-full flex justify-between text-white font-bold"><span><FileText className="inline w-5 h-5 mr-2"/>Pre-Game Checklist</span><span>{showChecklist?'▲':'▼'}</span></button>
          {showChecklist && <div className="mt-4 space-y-2">{['teamsPresent','playersVerified','fieldInspected','weatherConfirmed'].map(k=><label key={k} className="flex items-center gap-2 text-white"><input type="checkbox" checked={checklist[k as keyof typeof checklist]} onChange={e=>setChecklist({...checklist,[k]:e.target.checked})} />{k.replace(/([A-Z])/g,' $1').trim()}</label>)}</div>}
        </div>

        <div className="glass-card p-8 text-center mb-6">
          <div className="text-6xl font-mono text-white mb-4">{formatTime(time)}</div>
          <div className="flex justify-center gap-4">
            <button onClick={()=>setIsRunning(!isRunning)} className="px-6 py-3 rounded-lg font-bold" style={{background:isRunning?'#FF3B3B':'#00F5FF',color:'#121212'}}>{isRunning?'Pause':'Start'}</button>
            <button onClick={()=>{setTime(0);setIsRunning(false)}} className="px-6 py-3 rounded-lg bg-white/10 text-white">Reset</button>
          </div>
        </div>

        <div className="glass-card p-6 mb-6 flex justify-between items-center">
          <div className="text-center flex-1"><h2 className="text-xl text-white mb-2">{match.homeTeam?.name}</h2><div className="flex items-center justify-center gap-4"><button onClick={()=>setHomeScore(s=>Math.max(0,s-1))} className="p-2 bg-white/10 rounded">-</button><span className="text-5xl text-cyan-400">{homeScore}</span><button onClick={()=>setHomeScore(s=>s+1)} className="p-2 bg-white/10 rounded">+</button></div></div>
          <div className="text-4xl text-gray-500 px-8">-</div>
          <div className="text-center flex-1"><h2 className="text-xl text-white mb-2">{match.awayTeam?.name}</h2><div className="flex items-center justify-center gap-4"><button onClick={()=>setAwayScore(s=>Math.max(0,s-1))} className="p-2 bg-white/10 rounded">-</button><span className="text-5xl text-cyan-400">{awayScore}</span><button onClick={()=>setAwayScore(s=>s+1)} className="p-2 bg-white/10 rounded">+</button></div></div>
        </div>

        <div className="glass-card p-4 mb-6"><h3 className="text-white mb-2">Notes</h3><textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white" rows={3} /></div>
        <button onClick={submitReport} disabled={saving} className="w-full py-4 rounded-lg font-bold" style={{background:'#00F5FF',color:'#121212'}}>{saving?'Saving...':'Submit Final Report'}</button>
      </main>
    </div>
  )
}

export default function MatchCenterPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-cyan-400 border-t-2 border-b-2"></div></div>}><MatchCenterContent /></Suspense>
}
