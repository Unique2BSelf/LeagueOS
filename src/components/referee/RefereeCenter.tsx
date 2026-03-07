'use client';

import type { ComponentType, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  FileText,
  Loader2,
  MapPin,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type RefJob = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  field: string;
  division: string;
  pay: number;
  status: 'OPEN' | 'CLAIMED' | 'COMPLETED';
};

type RefProfile = {
  backgroundCheckStatus: string;
  backgroundCheckExpiresAt?: string | null;
  certificationUploaded: boolean;
  certificationExpiry?: string | null;
  certificationType?: string | null;
  totalPayouts: number;
  gamesWorked: number;
};

type Certification = {
  id: string;
  certificationType: string;
  status: string;
  expiresAt?: string | null;
  file?: { downloadUrl: string } | null;
};

type RefReport = {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

type RefPayouts = {
  totalEarnings: number;
  totalMatches: number;
  is1099Eligible: boolean;
  currentYearEarnings: number;
};

type RefLedger = {
  summary: {
    totalMatches: number;
    totalMinutes: number;
    totalEarnings: number;
    attendanceRate: number;
  };
  earningsByDivision: Record<string, number>;
};

export default function RefereeCenter() {
  const { user, loading: sessionLoading } = useSessionUser();
  const [activeTab, setActiveTab] = useState<'jobs' | 'reports' | 'payouts' | 'certifications'>('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<RefJob[]>([]);
  const [profile, setProfile] = useState<RefProfile | null>(null);
  const [reports, setReports] = useState<RefReport[]>([]);
  const [payouts, setPayouts] = useState<RefPayouts | null>(null);
  const [ledger, setLedger] = useState<RefLedger | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating1099, setGenerating1099] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [certificationType, setCertificationType] = useState('USSF');
  const [expiresAt, setExpiresAt] = useState('');

  const loadBoard = async () => {
    setLoading(true);
    setError('');

    try {
      const [jobsRes, reportsRes, payoutsRes, ledgerRes, certificationsRes] = await Promise.all([
        fetch('/api/ref/jobs', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referees/reports?status=FINAL', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referees/payouts', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referees/ledger', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referees/certifications', { credentials: 'include', cache: 'no-store' }),
      ]);

      const [jobsData, reportsData, payoutsData, ledgerData, certificationsData] = await Promise.all([
        jobsRes.json(),
        reportsRes.json(),
        payoutsRes.json(),
        ledgerRes.json(),
        certificationsRes.json(),
      ]);

      if (!jobsRes.ok) throw new Error(jobsData.error || 'Failed to load referee jobs');
      if (!reportsRes.ok) throw new Error(reportsData.error || 'Failed to load referee reports');
      if (!payoutsRes.ok) throw new Error(payoutsData.error || 'Failed to load referee payouts');
      if (!ledgerRes.ok) throw new Error(ledgerData.error || 'Failed to load referee ledger');
      if (!certificationsRes.ok) throw new Error(certificationsData.error || 'Failed to load certifications');

      setJobs(Array.isArray(jobsData.jobs) ? jobsData.jobs : []);
      setProfile(jobsData.refProfile || null);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setPayouts(payoutsData);
      setLedger(ledgerData);
      setCertifications(Array.isArray(certificationsData.certifications) ? certificationsData.certifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referee center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void loadBoard();
  }, [user, sessionLoading]);

  const updateJob = async (jobId: string, action: 'claim' | 'release') => {
    setClaimingId(jobId);
    setError('');
    try {
      const response = await fetch('/api/ref/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} job`);
      }
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    } finally {
      setClaimingId(null);
    }
  };

  const uploadCertification = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Choose a certification file before uploading');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('certificationType', certificationType);
      if (expiresAt) {
        formData.append('expiresAt', expiresAt);
      }

      const response = await fetch('/api/referees/certifications', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload certification');
      }

      setSelectedFile(null);
      setExpiresAt('');
      const input = document.getElementById('ref-cert-file') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload certification');
    } finally {
      setUploading(false);
    }
  };

  const generate1099 = async () => {
    setGenerating1099(true);
    setError('');
    try {
      const response = await fetch('/api/taxes/1099', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate 1099 data');
      }

      setError('');
      alert(`1099 preview ready for ${data.taxYear}\nTotal nonemployee comp: $${data.totalNonemployeeCompensation}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate 1099 data');
    } finally {
      setGenerating1099(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <div className="text-center">
          <p className="mb-4 text-white">Please log in to manage referee tools.</p>
          <Link href="/login?redirect=/dashboard/refs" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  const tabButton = (id: typeof activeTab, label: string, icon: ComponentType<{ className?: string }>) => {
    const Icon = icon;
    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${activeTab === id ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-white/65'}`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  };

  const isEligibleToClaim = profile?.backgroundCheckStatus === 'CLEAR' && Boolean(profile?.certificationUploaded);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Referee Center</h1>
            <p className="mt-1 text-white/50">Jobs, certifications, reports, and payout tracking in one session-backed flow.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-4">
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <div className="text-2xl font-bold text-cyan-400">{jobs.filter((job) => job.status === 'OPEN').length}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Open Jobs</div>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <div className="text-2xl font-bold text-green-400">{profile?.gamesWorked || 0}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Games Paid</div>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <div className="text-2xl font-bold text-yellow-400">${payouts?.currentYearEarnings || 0}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">YTD</div>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <div className={`text-2xl font-bold ${isEligibleToClaim ? 'text-emerald-400' : 'text-red-400'}`}>
                {isEligibleToClaim ? 'Ready' : 'Blocked'}
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Claim Status</div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabButton('jobs', 'Jobs', Calendar)}
        {tabButton('reports', 'Reports', FileText)}
        {tabButton('payouts', 'Payouts', DollarSign)}
        {tabButton('certifications', 'Certifications', Award)}
      </div>

      {activeTab === 'jobs' && (
        <section className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Available And Claimed Games</h2>
            <Link href="/ref/match" className="text-sm font-medium text-cyan-300">Open Match Center</Link>
          </div>
          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-white/55">Background Check</div>
              <div className={`mt-2 flex items-center gap-2 ${profile?.backgroundCheckStatus === 'CLEAR' ? 'text-emerald-300' : 'text-red-300'}`}>
                {profile?.backgroundCheckStatus === 'CLEAR' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {profile?.backgroundCheckStatus || 'NOT_INITIATED'}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-white/55">Certification</div>
              <div className={`mt-2 flex items-center gap-2 ${profile?.certificationUploaded ? 'text-emerald-300' : 'text-red-300'}`}>
                {profile?.certificationUploaded ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {profile?.certificationUploaded ? profile?.certificationType || 'ACTIVE' : 'Missing'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-white/40">No referee jobs are currently available.</p>
            ) : jobs.map((job) => (
              <div key={job.id} className="rounded-2xl bg-white/5 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-white">{job.homeTeam} vs {job.awayTeam}</div>
                    <div className="text-sm text-white/50">{new Date(job.scheduledAt).toLocaleString()}</div>
                    <div className="flex items-center gap-3 text-sm text-white/55">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.field}</span>
                      <span>{job.division}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">${job.pay}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">{job.status}</div>
                    </div>
                    {job.status === 'OPEN' ? (
                      <button
                        onClick={() => void updateJob(job.id, 'claim')}
                        disabled={claimingId === job.id}
                        className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                      >
                        {claimingId === job.id ? 'Claiming...' : 'Claim Game'}
                      </button>
                    ) : job.status === 'CLAIMED' ? (
                      <button
                        onClick={() => void updateJob(job.id, 'release')}
                        disabled={claimingId === job.id}
                        className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {claimingId === job.id ? 'Releasing...' : 'Release'}
                      </button>
                    ) : (
                      <span className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">Completed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="glass-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Submitted Match Reports</h2>
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-white/40">No submitted match reports yet.</p>
            ) : reports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{report.homeTeam.name} {report.homeScore ?? 0} - {report.awayScore ?? 0} {report.awayTeam.name}</div>
                    <div className="text-sm text-white/45">{new Date(report.scheduledAt).toLocaleString()}</div>
                  </div>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">{report.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'payouts' && (
        <section className="space-y-4">
          <div className="glass-card grid gap-4 p-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold text-green-400">${payouts?.totalEarnings || 0}</div>
              <div className="text-sm text-white/45">Total Earnings</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{payouts?.totalMatches || 0}</div>
              <div className="text-sm text-white/45">Matches Finalized</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <div className={`text-3xl font-bold ${payouts?.is1099Eligible ? 'text-yellow-400' : 'text-white/40'}`}>${payouts?.currentYearEarnings || 0}</div>
              <div className="text-sm text-white/45">1099 Threshold</div>
            </div>
          </div>

          {ledger && (
            <div className="glass-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Ledger Summary</h2>
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{ledger.summary.totalMatches}</div>
                  <div className="text-sm text-white/45">Assigned Matches</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{Math.round((ledger.summary.totalMinutes || 0) / 60)}h</div>
                  <div className="text-sm text-white/45">Minutes Worked</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{ledger.summary.attendanceRate}%</div>
                  <div className="text-sm text-white/45">Completion Rate</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">${ledger.summary.totalEarnings}</div>
                  <div className="text-sm text-white/45">Calculated Earnings</div>
                </div>
              </div>
            </div>
          )}

          {payouts?.is1099Eligible && (
            <div className="glass-card flex items-center justify-between gap-4 p-6">
              <div>
                <div className="text-lg font-semibold text-yellow-300">1099 threshold reached</div>
                <div className="text-sm text-white/50">You are over the current $600 reporting threshold.</div>
              </div>
              <button
                onClick={() => void generate1099()}
                disabled={generating1099}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
              >
                {generating1099 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {generating1099 ? 'Generating...' : 'Preview 1099'}
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'certifications' && (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Upload Certification</h2>
            <form onSubmit={uploadCertification} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">Certification Type</label>
                <select
                  value={certificationType}
                  onChange={(event) => setCertificationType(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <option value="USSF">USSF</option>
                  <option value="NFHS">NFHS</option>
                  <option value="League Approved">League Approved</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Expiration Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">File</label>
                <input
                  id="ref-cert-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
                />
              </div>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Certification
              </button>
            </form>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Current Records</h2>
            <div className="space-y-3">
              {certifications.length === 0 ? (
                <p className="text-white/40">No certifications uploaded yet.</p>
              ) : certifications.map((certification) => (
                <div key={certification.id} className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{certification.certificationType}</div>
                      <div className="text-sm text-white/45">
                        {certification.status}
                        {certification.expiresAt ? ` · ${new Date(certification.expiresAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    {certification.file ? (
                      <a href={certification.file.downloadUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-cyan-300">View</a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm text-white/55">
              <div className="mb-2 flex items-center gap-2 text-yellow-300">
                <ShieldAlert className="h-4 w-4" />
                Claiming stays blocked until background status is `CLEAR` and one certification is active.
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
