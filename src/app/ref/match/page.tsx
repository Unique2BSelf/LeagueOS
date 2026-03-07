'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shield,
  TimerReset,
} from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type MatchDetails = {
  id: string;
  scheduledAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; division?: { name: string } | null };
  awayTeam: { id: string; name: string; division?: { name: string } | null };
  season?: { id: string; name: string } | null;
};

type TeamPlayer = {
  userId: string;
  status: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
  };
};

type CardFormState = {
  playerId: string;
  teamId: string;
  cardType: 'RED' | 'YELLOW_2';
  fineAmount: string;
  suspensionGames: string;
  reportNotes: string;
};

function MatchCenterContent() {
  const params = useSearchParams();
  const matchId = params?.get('id') || '';
  const { user, loading: sessionLoading } = useSessionUser();

  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [homePlayers, setHomePlayers] = useState<TeamPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [showChecklist, setShowChecklist] = useState(true);
  const [checklist, setChecklist] = useState({
    teamsPresent: false,
    refereeConfirmed: false,
    fieldInspected: false,
    playerCardsChecked: false,
  });
  const [cardForm, setCardForm] = useState<CardFormState>({
    playerId: '',
    teamId: '',
    cardType: 'RED',
    fineAmount: '50',
    suspensionGames: '1',
    reportNotes: '',
  });

  const canUsePage = user?.role === 'REF' || user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning) {
      interval = setInterval(() => setTime((current) => current + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (!matchId || !user || !canUsePage) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const matchRes = await fetch(`/api/matches/${matchId}`, { cache: 'no-store' });
        if (!matchRes.ok) {
          throw new Error('Match not found');
        }

        const matchData: MatchDetails = await matchRes.json();
        setMatch(matchData);
        setHomeScore(matchData.homeScore || 0);
        setAwayScore(matchData.awayScore || 0);

        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/teams/${matchData.homeTeam.id}/players`, { cache: 'no-store' }),
          fetch(`/api/teams/${matchData.awayTeam.id}/players`, { cache: 'no-store' }),
        ]);

        if (homeRes.ok) {
          const homeData = await homeRes.json();
          setHomePlayers((homeData || []).filter((player: TeamPlayer) => player.status === 'APPROVED'));
        }

        if (awayRes.ok) {
          const awayData = await awayRes.json();
          setAwayPlayers((awayData || []).filter((player: TeamPlayer) => player.status === 'APPROVED'));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load match center');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canUsePage, matchId, user]);

  const rosterOptions = useMemo(() => {
    if (!match) return [];
    return [
      ...homePlayers.map((player) => ({
        label: `${player.user?.fullName || 'Unknown'} - ${match.homeTeam.name}`,
        playerId: player.userId,
        teamId: match.homeTeam.id,
      })),
      ...awayPlayers.map((player) => ({
        label: `${player.user?.fullName || 'Unknown'} - ${match.awayTeam.name}`,
        playerId: player.userId,
        teamId: match.awayTeam.id,
      })),
    ];
  }, [awayPlayers, homePlayers, match]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const applyChecklist = async () => {
    if (!match) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/match-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          action: 'update_checklist',
          ...checklist,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update checklist');
      }
      setSuccess('Checklist updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to update checklist');
    } finally {
      setSaving(false);
    }
  };

  const submitCard = async () => {
    if (!match || !cardForm.playerId || !cardForm.teamId) {
      setError('Select a player before submitting a card.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const eventType = cardForm.cardType === 'RED' ? 'RED_CARD' : 'YELLOW_CARD';
      const res = await fetch('/api/match-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          action: 'record_event',
          type: eventType,
          teamId: cardForm.teamId,
          playerId: cardForm.playerId,
          cardType: cardForm.cardType,
          minute: Math.floor(time / 60),
          fineAmount: Number(cardForm.fineAmount),
          suspensionGames: Number(cardForm.suspensionGames),
          description: cardForm.reportNotes,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to report card');
      }

      setCardForm((current) => ({
        ...current,
        playerId: '',
        teamId: '',
        reportNotes: '',
      }));
      setSuccess('Card submitted to disciplinary review.');
    } catch (err: any) {
      setError(err.message || 'Failed to report card');
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    if (!match) return;
    if (!Object.values(checklist).every(Boolean)) {
      setShowChecklist(true);
      setError('Complete the pre-game checklist before finalizing the report.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/referees/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore,
          awayScore,
          notes,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to submit final report');
      }
      setSuccess('Final report submitted.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit final report');
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user || !canUsePage) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <p className="text-white">Referee, moderator, or admin access required.</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <p className="mb-4 text-white">Match not found.</p>
          <Link href="/ref/jobs" className="btn-primary">
            Back to Ref Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/ref/jobs" className="text-cyan-400 hover:text-cyan-300">
            Back to Jobs
          </Link>
          <span className="text-sm text-white/45">
            {new Date(match.scheduledAt).toLocaleString()}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-bold text-white">Match Center</h1>
          <p className="mt-2 text-white/55">
            {match.homeTeam.name} vs {match.awayTeam.name}
            {match.homeTeam.division?.name ? ` • ${match.homeTeam.division.name}` : ''}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300">
            {success}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="glass-card p-8 text-center">
              <div className="text-6xl font-mono font-bold text-white">{formatTime(time)}</div>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={() => setIsRunning((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold"
                  style={{ background: isRunning ? '#FF3B3B' : '#00F5FF', color: '#121212' }}
                >
                  {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={() => {
                    setTime(0);
                    setIsRunning(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
                >
                  <TimerReset className="h-5 w-5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="mb-6 flex items-center gap-2">
                <Save className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Scoreboard</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-[1fr,auto,1fr]">
                <div className="text-center">
                  <h3 className="mb-3 text-xl font-semibold text-white">{match.homeTeam.name}</h3>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setHomeScore((score) => Math.max(0, score - 1))}
                      className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/15"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <span className="text-5xl font-bold text-cyan-400">{homeScore}</span>
                    <button
                      onClick={() => setHomeScore((score) => score + 1)}
                      className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/15"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center text-4xl text-white/35">-</div>
                <div className="text-center">
                  <h3 className="mb-3 text-xl font-semibold text-white">{match.awayTeam.name}</h3>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setAwayScore((score) => Math.max(0, score - 1))}
                      className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/15"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <span className="text-5xl font-bold text-cyan-400">{awayScore}</span>
                    <button
                      onClick={() => setAwayScore((score) => score + 1)}
                      className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/15"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-xl font-bold text-white">Pre-Game Checklist</h2>
                </div>
                <button
                  onClick={() => setShowChecklist((current) => !current)}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                >
                  {showChecklist ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {showChecklist && (
                <div className="space-y-3">
                  {[
                    ['teamsPresent', 'Teams present'],
                    ['refereeConfirmed', 'Referee confirmed'],
                    ['fieldInspected', 'Field inspected'],
                    ['playerCardsChecked', 'Player ID cards checked'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-white/80">
                      <input
                        type="checkbox"
                        checked={checklist[key as keyof typeof checklist]}
                        onChange={(event) => setChecklist((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))}
                      />
                      {label}
                    </label>
                  ))}
                  <button
                    onClick={applyChecklist}
                    disabled={saving}
                    className="mt-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    Save Checklist
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Report Card</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Player</label>
                  <select
                    value={cardForm.playerId ? `${cardForm.teamId}:${cardForm.playerId}` : ''}
                    onChange={(event) => {
                      const [teamId, playerId] = event.target.value.split(':');
                      const selected = rosterOptions.find((option) => option.playerId === playerId && option.teamId === teamId);
                      setCardForm((current) => ({
                        ...current,
                        teamId,
                        playerId,
                        fineAmount: selected && teamId === match.awayTeam.id ? current.fineAmount : current.fineAmount,
                      }));
                    }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                    data-testid="ref-card-player-select"
                  >
                    <option value="">Select player</option>
                    {rosterOptions.map((option) => (
                      <option key={`${option.teamId}:${option.playerId}`} value={`${option.teamId}:${option.playerId}`}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-white/70">Card Type</label>
                    <select
                      value={cardForm.cardType}
                      onChange={(event) => setCardForm((current) => ({
                        ...current,
                        cardType: event.target.value as 'RED' | 'YELLOW_2',
                        fineAmount: event.target.value === 'RED' ? '50' : '25',
                        suspensionGames: event.target.value === 'RED' ? '1' : '0',
                      }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                    >
                      <option value="RED">Red Card</option>
                      <option value="YELLOW_2">Second Yellow</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/70">Fine Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cardForm.fineAmount}
                      onChange={(event) => setCardForm((current) => ({ ...current, fineAmount: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Suspension Games</label>
                  <input
                    type="number"
                    min="0"
                    value={cardForm.suspensionGames}
                    onChange={(event) => setCardForm((current) => ({ ...current, suspensionGames: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Report Notes</label>
                  <textarea
                    value={cardForm.reportNotes}
                    onChange={(event) => setCardForm((current) => ({ ...current, reportNotes: event.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                    placeholder="Describe the incident"
                  />
                </div>

                <button
                  onClick={submitCard}
                  disabled={saving}
                  className="w-full rounded-lg bg-red-500/20 px-4 py-3 font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                  data-testid="ref-submit-card-button"
                >
                  Submit Card to Review Queue
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Finalize Match Report</h2>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Match Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                  placeholder="Summary of incidents, weather, or disputes"
                />
              </div>
              <button
                onClick={submitReport}
                disabled={saving}
                className="mt-4 w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-[#121212] hover:opacity-90 disabled:opacity-50"
                data-testid="ref-submit-report-button"
              >
                {saving ? 'Saving...' : 'Submit Final Report'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MatchCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        </div>
      }
    >
      <MatchCenterContent />
    </Suspense>
  );
}
