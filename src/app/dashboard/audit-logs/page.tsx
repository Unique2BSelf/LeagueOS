'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { History, Loader2, ShieldCheck } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type AuditLog = {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
};

const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ACTIVATE', 'DEACTIVATE', 'EXPORT'];
const ENTITY_OPTIONS = ['', 'SEASON', 'REGISTRATION', 'INSURANCE_POLICY', 'USER', 'REPORT'];

export default function AuditLogsPage() {
  const { user, loading: userLoading } = useSessionUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    actorUserId: '',
    actionType: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.actorUserId) params.set('actorUserId', filters.actorUserId);
    if (filters.actionType) params.set('actionType', filters.actionType);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    return params.toString();
  }, [filters]);

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

    fetch(`/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load audit logs');
        }

        setLogs(payload.logs || []);
      })
      .catch((auditError) => {
        console.error(auditError);
        setError(auditError instanceof Error ? auditError.message : 'Failed to load audit logs');
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [queryString, user, userLoading]);

  const formatJson = (value: Record<string, unknown> | null) => {
    if (!value || Object.keys(value).length === 0) {
      return 'N/A';
    }
    return JSON.stringify(value, null, 2);
  };

  if (!user && !userLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-white mb-4">Please log in to access audit logs.</p>
        <Link href="/login" className="btn-primary">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/20 p-3">
            <History className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-white/60">Trace sensitive admin actions and exports.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="grid gap-4 md:grid-cols-5">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-white/60">Actor User ID</span>
            <input
              type="text"
              value={filters.actorUserId}
              onChange={(event) => setFilters((current) => ({ ...current, actorUserId: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
              placeholder="Filter by actor id"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">Action</span>
            <select
              value={filters.actionType}
              onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option || 'all-actions'} value={option}>
                  {option || 'All actions'}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">Entity</span>
            <select
              value={filters.entityType}
              onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option || 'all-entities'} value={option}>
                  {option || 'All entities'}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
          </label>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Recent Admin Activity</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-300" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-300">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No audit entries matched the current filters.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {logs.map((log) => (
              <div key={log.id} className="space-y-4 px-6 py-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-cyan-200">{log.actionType}</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">{log.entityType}</span>
                    <span className="text-white/60">{log.entityId}</span>
                  </div>
                  <div className="text-xs text-white/50">
                    {new Date(log.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="text-sm text-white/70">
                  Actor: <span className="text-white">{log.actorEmail || log.actorUserId}</span>
                </div>

                {log.notes ? <div className="text-sm text-white/60">{log.notes}</div> : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/40">Before</div>
                    <pre className="overflow-x-auto rounded-lg bg-black/20 p-4 text-xs text-white/70">
                      {formatJson(log.before)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/40">After</div>
                    <pre className="overflow-x-auto rounded-lg bg-black/20 p-4 text-xs text-white/70">
                      {formatJson(log.after)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
