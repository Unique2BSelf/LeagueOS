'use client';

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { getStoredUser } from '@/lib/client-auth';

type CheckStatus = 'NOT_INITIATED' | 'PENDING' | 'CLEAR' | 'FAIL' | 'EXPIRED';

interface BackgroundCheck {
  id?: string;
  status: CheckStatus;
  provider?: string;
  expiresAt?: string;
  createdAt?: string;
}

export default function BackgroundCheckPage() {
  const [check, setCheck] = useState<BackgroundCheck>({ status: 'NOT_INITIATED' });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.id) {
      return;
    }

    setUserId(user.id);
    fetchStatus(user.id);
  }, []);

  const fetchStatus = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/background-checks?userId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setCheck({
          id: data.id,
          status: data.status || 'NOT_INITIATED',
          provider: data.provider,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const initiateCheck = async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/background-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'initiate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheck(data.check);
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Background Check</h1>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Verification Status</h2>
          <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${getStatusColor(check.status)}`}>
            {getStatusIcon(check.status)}
            <span className="font-semibold">{check.status}</span>
          </div>
        </div>

        {check.id && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Provider</span>
              <span>{check.provider}</span>
            </div>
            {check.createdAt && (
              <div className="flex justify-between">
                <span className="text-secondary">Initiated</span>
                <span>{new Date(check.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {check.expiresAt && (
              <div className="flex justify-between">
                <span className="text-secondary">Expires</span>
                <span>{new Date(check.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-semibold mb-4">Why Background Checks?</h3>
        <ul className="text-sm text-secondary space-y-2">
          <li>• Required for all referees and volunteers</li>
          <li>• Ensures safe environment for all players</li>
          <li>• Valid for 1 year from clearance date</li>
          <li>• League liability requirement</li>
        </ul>
      </div>

      <div className="glass-card p-6">
        {check.status === 'CLEAR' ? (
          <div className="text-center">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
            <p className="text-green-400 font-semibold">You are verified!</p>
            <p className="text-sm text-secondary mt-2">
              Your background check is valid until {check.expiresAt ? new Date(check.expiresAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        ) : check.status === 'PENDING' ? (
          <div className="text-center">
            <Clock className="text-yellow-400 mx-auto mb-4 animate-pulse" size={48} />
            <p className="text-yellow-400 font-semibold">Check in progress...</p>
            <p className="text-sm text-secondary mt-2">This typically takes 1-2 business days</p>
          </div>
        ) : (
          <div className="text-center">
            <Shield className="text-accent mx-auto mb-4" size={48} />
            <p className="mb-4">Initiate a background check to verify your identity</p>
            <button onClick={initiateCheck} disabled={loading || !userId} className="btn-primary w-full">
              {loading ? 'Processing...' : 'Initiate Background Check'}
            </button>
            <p className="text-xs text-secondary mt-4">
              Powered by Checkr. This is still a stubbed provider integration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

