'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type SeasonOption = {
  id: string;
  name: string;
};

type ReportRow = {
  registrationId: string;
  seasonId: string;
  seasonName: string;
  playerId: string;
  playerName: string;
  email: string;
  registrationStatus: string;
  paid: boolean;
  amount: number;
  registeredAt: string;
  insuranceStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'MISSING';
  insuranceEffectiveDate: string | null;
  insuranceExpiry: string | null;
  insuranceProvider: string | null;
};

type ReportSummary = {
  totalRows: number;
  paidCount: number;
  unpaidCount: number;
  activeInsuranceCount: number;
  expiringInsuranceCount: number;
  expiredInsuranceCount: number;
  missingInsuranceCount: number;
};

const defaultSummary: ReportSummary = {
  totalRows: 0,
  paidCount: 0,
  unpaidCount: 0,
  activeInsuranceCount: 0,
  expiringInsuranceCount: 0,
  expiredInsuranceCount: 0,
  missingInsuranceCount: 0,
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid registrations' },
  { value: 'unpaid', label: 'Unpaid registrations' },
  { value: 'active', label: 'Active insurance' },
  { value: 'expiring', label: 'Expiring insurance' },
  { value: 'expired', label: 'Expired insurance' },
  { value: 'missing', label: 'Missing insurance' },
];

export default function ReportsPage() {
  const { user, loading: userLoading } = useSessionUser();
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    seasonId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.seasonId) params.set('seasonId', filters.seasonId);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    fetch('/api/seasons')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load seasons');
        }
        return response.json();
      })
      .then((data) => setSeasons(Array.isArray(data) ? data : []))
      .catch((seasonError) => {
        console.error(seasonError);
      });
  }, []);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/admin/reports/insurance${queryString ? `?${queryString}` : ''}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load report');
        }

        setRows(payload.rows || []);
        setSummary(payload.summary || defaultSummary);
      })
      .catch((reportError) => {
        console.error(reportError);
        setError(reportError instanceof Error ? reportError.message : 'Failed to load report');
        setRows([]);
        setSummary(defaultSummary);
      })
      .finally(() => setLoading(false));
  }, [queryString, user, userLoading]);

  const exportHref = `/api/admin/reports/insurance/export?format=csv${queryString ? `&${queryString}` : ''}`;

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  const getInsuranceBadgeClass = (status: ReportRow['insuranceStatus']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-300';
      case 'EXPIRING':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'EXPIRED':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  if (!user && !userLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-white mb-4">Please log in to access admin reports.</p>
        <Link href="/login" className="btn-primary">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
            <p className="text-white/60">Insurance and season registration reporting for admins.</p>
          </div>
          <a href={exportHref} className="btn-secondary inline-flex items-center gap-2 self-start">
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm text-white/60">Season</span>
            <select
              value={filters.seasonId}
              onChange={(event) => setFilters((current) => ({ ...current, seasonId: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              <option value="">All seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">Registered From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">Registered To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/20 p-3">
              <FileText className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm text-white/60">Rows</div>
              <div className="text-2xl font-semibold text-white">{summary.totalRows}</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-3">
              <Wallet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm text-white/60">Paid / Unpaid</div>
              <div className="text-2xl font-semibold text-white">{summary.paidCount} / {summary.unpaidCount}</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-3">
              <ShieldAlert className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <div className="text-sm text-white/60">Active / Expiring</div>
              <div className="text-2xl font-semibold text-white">{summary.activeInsuranceCount} / {summary.expiringInsuranceCount}</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-3">
              <ShieldAlert className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <div className="text-sm text-white/60">Expired / Missing</div>
              <div className="text-2xl font-semibold text-white">{summary.expiredInsuranceCount} / {summary.missingInsuranceCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Insurance Compliance</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-300" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-300">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No registrations matched the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Season</th>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Insurance</th>
                  <th className="px-4 py-3">Insurance Expiry</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.registrationId} className="text-sm text-white/80">
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{row.playerName}</div>
                      <div className="text-xs text-white/50">{row.email}</div>
                    </td>
                    <td className="px-4 py-4">{row.seasonName}</td>
                    <td className="px-4 py-4">
                      <div>{row.registrationStatus}</div>
                      <div className="text-xs text-white/50">${row.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4">{row.paid ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getInsuranceBadgeClass(row.insuranceStatus)}`}>
                        {row.insuranceStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>{formatDate(row.insuranceExpiry)}</div>
                      <div className="text-xs text-white/50">{row.insuranceProvider || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">{formatDate(row.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
