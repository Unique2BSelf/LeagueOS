'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Megaphone } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type Option = { id: string; name: string; seasonName?: string; divisionName?: string };
type RecentEmail = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  audienceType: string | null;
  createdAt: string;
  sentAt: string | null;
  errorMessage: string | null;
};

const audienceOptions = [
  { value: 'ALL_PLAYERS', label: 'All Players' },
  { value: 'REFEREES', label: 'Referees' },
  { value: 'SEASON', label: 'Season Registrants' },
  { value: 'DIVISION', label: 'Division Players' },
  { value: 'TEAM', label: 'Team Players' },
];

export default function CommunicationsPage() {
  const { user, loading: userLoading } = useSessionUser();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [seasons, setSeasons] = useState<Option[]>([]);
  const [divisions, setDivisions] = useState<Option[]>([]);
  const [teams, setTeams] = useState<Option[]>([]);
  const [form, setForm] = useState({
    audienceType: 'ALL_PLAYERS',
    seasonId: '',
    divisionId: '',
    teamId: '',
    subject: '',
    message: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/communications', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load communications');
      }
      setRecentEmails(payload.recentEmails || []);
      setSeasons(payload.options?.seasons || []);
      setDivisions(payload.options?.divisions || []);
      setTeams(payload.options?.teams || []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, userLoading]);

  const selectedHelper = useMemo(() => {
    switch (form.audienceType) {
      case 'SEASON':
        return 'Only players registered to the selected season will receive this email.';
      case 'DIVISION':
        return 'Only approved players on teams in the selected division will receive this email.';
      case 'TEAM':
        return 'Only approved players on the selected team will receive this email.';
      case 'REFEREES':
        return 'All active referee accounts will receive this email.';
      default:
        return 'All active player accounts will receive this email.';
    }
  }, [form.audienceType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send communication');
      }
      setNotice(`Queued ${payload.recipientCount} emails. Sent: ${payload.sentCount}, skipped: ${payload.skippedCount}, failed: ${payload.failedCount}.`);
      setForm((current) => ({ ...current, subject: '', message: '' }));
      await loadData();
    } catch (sendError) {
      console.error(sendError);
      setError(sendError instanceof Error ? sendError.message : 'Failed to send communication');
    } finally {
      setSending(false);
    }
  };

  if (!user && !userLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-white mb-4">Please log in to access communications.</p>
        <Link href="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/20 p-3">
            <Megaphone className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Communications</h1>
            <p className="text-white/60">Email players, referees, seasons, divisions, or teams from one place.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Compose Email</h2>
          {error ? <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}
          {notice ? <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{notice}</div> : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-white/60">Audience</span>
                <select
                  value={form.audienceType}
                  onChange={(event) => setForm((current) => ({ ...current, audienceType: event.target.value, seasonId: '', divisionId: '', teamId: '' }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
                >
                  {audienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              {form.audienceType === 'SEASON' ? (
                <label className="space-y-2">
                  <span className="text-sm text-white/60">Season</span>
                  <select value={form.seasonId} onChange={(event) => setForm((current) => ({ ...current, seasonId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white">
                    <option value="">Select season</option>
                    {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
                  </select>
                </label>
              ) : null}

              {form.audienceType === 'DIVISION' ? (
                <label className="space-y-2">
                  <span className="text-sm text-white/60">Division</span>
                  <select value={form.divisionId} onChange={(event) => setForm((current) => ({ ...current, divisionId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white">
                    <option value="">Select division</option>
                    {divisions.map((division) => <option key={division.id} value={division.id}>{division.name} ({division.seasonName})</option>)}
                  </select>
                </label>
              ) : null}

              {form.audienceType === 'TEAM' ? (
                <label className="space-y-2">
                  <span className="text-sm text-white/60">Team</span>
                  <select value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white">
                    <option value="">Select team</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name} ({team.divisionName})</option>)}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{selectedHelper}</div>

            <label className="space-y-2 block">
              <span className="text-sm text-white/60">Subject</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
                placeholder="League update"
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm text-white/60">Message</span>
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="h-48 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Write your message here..."
                required
              />
            </label>

            <button type="submit" disabled={sending || loading} className="btn-primary inline-flex items-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Email
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Outbound Email</h2>
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div>
          ) : recentEmails.length === 0 ? (
            <p className="text-sm text-white/50">No email activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEmails.map((email) => (
                <div key={email.id} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="font-medium text-white">{email.subject}</div>
                  <div className="mt-1 text-white/60">{email.toEmail}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                    <span className="rounded-full bg-white/10 px-2 py-1">{email.status}</span>
                    {email.audienceType ? <span className="rounded-full bg-white/10 px-2 py-1">{email.audienceType}</span> : null}
                  </div>
                  {email.errorMessage ? <div className="mt-2 text-red-300">{email.errorMessage}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
