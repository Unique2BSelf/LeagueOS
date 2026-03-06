'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle, DollarSign, Loader2, MapPin, Shield, Upload, XCircle } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

interface Job {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  field: string;
  division: string;
  pay: number;
  status: 'OPEN' | 'CLAIMED' | 'COMPLETED';
  claimedBy?: string;
}

interface RefProfile {
  backgroundCheckStatus: string;
  backgroundCheckExpiresAt?: string | null;
  certificationUploaded: boolean;
  certificationExpiry?: string | null;
  certificationType?: string | null;
  totalPayouts: number;
  gamesWorked: number;
}

interface Certification {
  id: string;
  certificationType: string;
  status: string;
  expiresAt?: string | null;
  file?: {
    downloadUrl: string;
  } | null;
}

export default function RefJobsPage() {
  const { user, loading: sessionLoading } = useSessionUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<RefProfile | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [certificationType, setCertificationType] = useState('USSF');
  const [expiresAt, setExpiresAt] = useState('');

  const loadBoard = async () => {
    try {
      const [jobsRes, certRes] = await Promise.all([
        fetch('/api/ref/jobs', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/referees/certifications', { credentials: 'include', cache: 'no-store' }),
      ]);

      const jobsData = await jobsRes.json();
      const certData = await certRes.json();

      if (!jobsRes.ok) {
        throw new Error(jobsData.error || 'Failed to load referee jobs');
      }
      if (!certRes.ok) {
        throw new Error(certData.error || 'Failed to load certifications');
      }

      setJobs(Array.isArray(jobsData.jobs) ? jobsData.jobs : []);
      setProfile(jobsData.refProfile || null);
      setCertifications(Array.isArray(certData.certifications) ? certData.certifications : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referee tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void loadBoard();
  }, [user]);

  const claimJob = async (jobId: string) => {
    setClaimingId(jobId);
    setError('');

    try {
      const res = await fetch('/api/ref/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, action: 'claim' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim game');
      }

      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim game');
    } finally {
      setClaimingId(null);
    }
  };

  const uploadCertification = async (event: React.FormEvent) => {
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

      const res = await fetch('/api/referees/certifications', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload certification');
      }

      setSelectedFile(null);
      setExpiresAt('');
      const input = document.getElementById('certification-file') as HTMLInputElement | null;
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
          <p className="mb-4 text-white">Please log in to use the referee job board.</p>
          <Link href="/login?redirect=/ref/jobs" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Referee Job Board</h1>
            <p className="mt-1 text-gray-400">Real gate checks now use persisted background-check and certification records.</p>
          </div>
          <div className="glass-card px-4 py-3">
            <div className="text-sm text-gray-400">Available Games</div>
            <div className="text-2xl font-bold text-cyan-400">{jobs.filter((job) => job.status === 'OPEN').length}</div>
          </div>
        </div>

        {error && (
          <div className="glass-card mb-6 border border-red-500/30 p-4 text-red-200">{error}</div>
        )}

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Eligibility</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <div>
                  <div className="text-white">Background Check</div>
                  <div className="text-sm text-white/45">
                    {profile?.backgroundCheckExpiresAt ? `Expires ${new Date(profile.backgroundCheckExpiresAt).toLocaleDateString()}` : 'No clearance on file'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile?.backgroundCheckStatus === 'CLEAR' ? <CheckCircle className="text-green-400" /> : <XCircle className="text-red-400" />}
                  <span className={profile?.backgroundCheckStatus === 'CLEAR' ? 'text-green-400' : 'text-red-400'}>
                    {profile?.backgroundCheckStatus || 'NOT_INITIATED'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <div>
                  <div className="text-white">Certification</div>
                  <div className="text-sm text-white/45">
                    {profile?.certificationType || 'No certification uploaded'}
                    {profile?.certificationExpiry ? ` · Expires ${new Date(profile.certificationExpiry).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile?.certificationUploaded ? <CheckCircle className="text-green-400" /> : <XCircle className="text-red-400" />}
                  <span className={profile?.certificationUploaded ? 'text-green-400' : 'text-red-400'}>
                    {profile?.certificationUploaded ? 'ACTIVE' : 'MISSING'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4 text-sm text-white/55">
                Claiming is blocked until background status is `CLEAR` and at least one active certification is on file.
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Upload Certification</h2>
            <form onSubmit={uploadCertification} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/65">Certification type</label>
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
                <label className="mb-2 block text-sm text-white/65">Expiration date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/65">Document</label>
                <input
                  id="certification-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload certification
              </button>
            </form>

            {certifications.length > 0 && (
              <div className="mt-5 space-y-2">
                {certifications.slice(0, 3).map((certification) => (
                  <div key={certification.id} className="rounded-xl bg-white/5 p-3 text-sm">
                    <div className="text-white">{certification.certificationType}</div>
                    <div className="text-white/45">
                      {certification.status}
                      {certification.expiresAt ? ` · ${new Date(certification.expiresAt).toLocaleDateString()}` : ''}
                    </div>
                    {certification.file && (
                      <a href={certification.file.downloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-cyan-300 hover:text-cyan-200">
                        View file
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="glass-card p-5 hover:border-cyan-500/50 transition">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs uppercase text-gray-500">{new Date(job.scheduledAt).toLocaleDateString()}</div>
                    <div className="text-lg font-bold text-white">{new Date(job.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div>
                    <div className="text-lg font-semibold text-white">{job.homeTeam}</div>
                    <div className="text-gray-500">vs</div>
                    <div className="text-lg font-semibold text-white">{job.awayTeam}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <MapPin className="h-4 w-4" /> {job.field}
                    </div>
                    <div className="text-sm text-cyan-400">{job.division}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xl font-bold text-green-400">
                      <DollarSign className="h-5 w-5" /> {job.pay}
                    </div>
                    <div className="text-xs text-gray-500">Payout</div>
                  </div>
                  <button
                    onClick={() => void claimJob(job.id)}
                    disabled={claimingId === job.id || job.status !== 'OPEN'}
                    className="rounded-lg px-6 py-2 font-semibold transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: '#00F5FF', color: '#121212' }}
                  >
                    {claimingId === job.id ? 'Claiming...' : job.status === 'OPEN' ? 'Claim Game' : job.status}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="mb-3 font-semibold text-white">Requirements</h3>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-center gap-2"><span className="text-cyan-400">▸</span> Upload active certification documentation</li>
            <li className="flex items-center gap-2"><span className="text-cyan-400">▸</span> Background check must be cleared</li>
            <li className="flex items-center gap-2"><span className="text-cyan-400">▸</span> Report to field 15 minutes before kickoff</li>
            <li className="flex items-center gap-2"><span className="text-cyan-400">▸</span> Submit match report within 4 hours</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
