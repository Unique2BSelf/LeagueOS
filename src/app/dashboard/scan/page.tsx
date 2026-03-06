'use client';

import { FormEvent, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

interface ScanResult {
  valid: boolean;
  checkedAt: string;
  expiresAt: string;
  player: {
    id: string;
    fullName: string;
    role: string;
    photoUrl: string | null;
    backgroundCheckStatus: string;
    isInsured: boolean;
    insuranceExpiry: string | null;
    isActive: boolean;
    isSuspended: boolean;
    hasUnpaidFines: boolean;
    unpaidFineAmount: number;
    valid: boolean;
    reason: string | null;
  };
}

export default function ScanPage() {
  const { user, loading } = useSessionUser();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);

  const canScan = user && ['ADMIN', 'MODERATOR', 'REF'].includes(user.role);

  const handleValidate = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/id/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to validate ID token');
        return;
      }

      setResult(data);
    } catch {
      setError('Unable to validate ID token');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!canScan) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <h1 className="mb-2 text-2xl font-bold text-white">Scanner Access Required</h1>
          <p className="text-white/50">Only refs, moderators, and admins can validate player IDs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass-card p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Digital ID Scanner</h1>
            <p className="text-white/50">Paste or scan a signed player token to verify live eligibility.</p>
          </div>
          <div className="rounded-full bg-cyan-500/10 p-3">
            <Camera className="h-6 w-6 text-cyan-400" />
          </div>
        </div>

        <form onSubmit={handleValidate} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Signed ID token</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-cyan-400"
              placeholder="Paste the QR payload here"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !token}
            className="btn-primary inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Validate Player ID
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className={`mt-6 rounded-xl border p-5 ${result.valid ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
            <div className="mb-4 flex items-center gap-3">
              {result.valid ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">{result.player.fullName}</h2>
                <p className="text-sm text-white/60">
                  Checked {new Date(result.checkedAt).toLocaleString()} | Token expires {new Date(result.expiresAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Eligibility</p>
                <p className={`mt-1 font-semibold ${result.valid ? 'text-green-300' : 'text-red-300'}`}>
                  {result.valid ? 'Active and eligible' : result.player.reason || 'Not eligible'}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Insurance</p>
                <p className={`mt-1 font-semibold ${result.player.isInsured ? 'text-green-300' : 'text-red-300'}`}>
                  {result.player.isInsured
                    ? `Valid through ${result.player.insuranceExpiry ? new Date(result.player.insuranceExpiry).toLocaleDateString() : 'active policy'}`
                    : 'Missing or expired'}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Fines</p>
                <p className={`mt-1 font-semibold ${result.player.hasUnpaidFines ? 'text-red-300' : 'text-green-300'}`}>
                  {result.player.hasUnpaidFines ? `$${result.player.unpaidFineAmount.toFixed(2)} outstanding` : 'No unpaid fines'}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Background Check</p>
                <p className="mt-1 font-semibold text-white">{result.player.backgroundCheckStatus}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
