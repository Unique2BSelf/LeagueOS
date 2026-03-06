'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Clock, Loader2, Shield, Upload, XCircle } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type CheckStatus = 'NOT_INITIATED' | 'PENDING' | 'CLEAR' | 'FAIL' | 'EXPIRED';

interface BackgroundCheckDocument {
  id: string;
  displayName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
}

interface BackgroundCheck {
  id?: string;
  status: CheckStatus;
  provider?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  document?: BackgroundCheckDocument | null;
}

export default function BackgroundCheckPage() {
  const { user, loading: sessionLoading } = useSessionUser();
  const [check, setCheck] = useState<BackgroundCheck>({ status: 'NOT_INITIATED' });
  const [provider, setProvider] = useState('Checkr');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/background-checks', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load background check');
      }

      setCheck({
        id: data.id,
        status: data.status || 'NOT_INITIATED',
        provider: data.provider,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        notes: data.notes,
        document: data.document || null,
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load background check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void fetchStatus();
  }, [user]);

  const submitCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Upload a background-check document before submitting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('provider', provider);
      formData.append('notes', notes);
      formData.append('file', selectedFile);

      const res = await fetch('/api/background-checks', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit background check');
      }

      setCheck(data.check);
      setSelectedFile(null);
      setNotes('');
      const input = document.getElementById('background-check-file') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit background check');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'CLEAR':
        return <CheckCircle className="text-green-400" size={24} />;
      case 'PENDING':
        return <Clock className="text-yellow-400" size={24} />;
      case 'FAIL':
      case 'EXPIRED':
        return <XCircle className="text-red-400" size={24} />;
      default:
        return <AlertTriangle className="text-gray-400" size={24} />;
    }
  };

  const getStatusColor = (status: CheckStatus) => {
    switch (status) {
      case 'CLEAR':
        return 'status-active';
      case 'PENDING':
        return 'status-pending';
      case 'FAIL':
      case 'EXPIRED':
        return 'status-locked';
      default:
        return 'bg-gray-800';
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-white">Please log in to manage background checks</p>
          <Link href="/login?redirect=/dashboard/background-check" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="glass-card p-6">
        <h1 className="mb-2 text-2xl font-bold text-white">Background Check</h1>
        <p className="text-white/55">
          Upload supporting documents here. Review status now persists in the database and uses private signed file storage.
        </p>
      </div>

      {error && (
        <div className="glass-card border border-red-500/30 p-4 text-red-200">{error}</div>
      )}

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Verification Status</h2>
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${getStatusColor(check.status)}`}>
            {getStatusIcon(check.status)}
            <span className="font-semibold">{check.status}</span>
          </div>
        </div>

        {check.id ? (
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex justify-between gap-4">
              <span className="text-white/45">Provider</span>
              <span>{check.provider || 'Unknown'}</span>
            </div>
            {check.createdAt && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Submitted</span>
                <span>{new Date(check.createdAt).toLocaleString()}</span>
              </div>
            )}
            {check.expiresAt && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Expires</span>
                <span>{new Date(check.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
            {check.notes && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/65">
                {check.notes}
              </div>
            )}
            {check.document && (
              <a
                href={check.document.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-cyan-300 hover:bg-white/10"
              >
                <Upload className="h-4 w-4" />
                View uploaded document
              </a>
            )}
          </div>
        ) : (
          <p className="text-white/50">No background check on file.</p>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="mb-4 font-semibold text-white">Submit Background Check Document</h3>

        {check.status === 'CLEAR' ? (
          <div className="text-center">
            <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
            <p className="font-semibold text-green-400">You are cleared.</p>
            <p className="mt-2 text-sm text-white/55">
              This status now comes from the latest persisted review record, not mock state.
            </p>
          </div>
        ) : (
          <form onSubmit={submitCheck} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/65">Provider</label>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              >
                <option value="Checkr">Checkr</option>
                <option value="Sterling">Sterling</option>
                <option value="Manual Review">Manual Review</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/65">Supporting document</label>
              <input
                id="background-check-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
              />
              <p className="mt-2 text-xs text-white/35">
                Upload the provider report, screenshot, or approval PDF. The file is stored privately and served with signed links.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/65">Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional notes for league admins"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Submit for review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
