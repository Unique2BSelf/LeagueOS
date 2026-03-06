'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, CreditCard, AlertCircle, CheckCircle, Clock, WifiOff, ScanLine } from 'lucide-react';
import QRCode from 'qrcode';
import { getStoredUser, syncStoredUser } from '@/lib/client-auth';

interface User {
  id: string;
  fullName: string;
  email: string;
  photoUrl: string | null;
  role: string;
  isInsured: boolean;
  insuranceExpiry: string | null;
  isActive: boolean;
  hasUnpaidFines: boolean;
  unpaidFineAmount: number;
  backgroundCheckStatus: string;
  lockReason: string | null;
}

const REFRESH_INTERVAL = 60000;

function buildFallbackUser() {
  const stored = getStoredUser();
  if (!stored) {
    return null;
  }

  return {
    id: stored.id,
    fullName: stored.fullName,
    email: stored.email,
    photoUrl: stored.photoUrl || null,
    role: stored.role,
    isInsured: false,
    insuranceExpiry: null,
    isActive: true,
    hasUnpaidFines: false,
    unpaidFineAmount: 0,
    backgroundCheckStatus: 'PENDING',
    lockReason: null,
  } satisfies User;
}

export default function DigitalIDPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        await syncStoredUser();
        const res = await fetch('/api/users/me', { cache: 'no-store', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(buildFallbackUser());
        }
      } catch {
        setUser(buildFallbackUser());
        setIsOffline(true);
      }
      setLoading(false);
      setLastSynced(new Date());
    }
    fetchUser();
  }, []);

  const isLocked = !user?.isActive || user?.hasUnpaidFines || !user?.isInsured;
  const lockReason = user?.lockReason ||
    (user?.hasUnpaidFines ? `Unpaid Fine: $${user.unpaidFineAmount}` :
    !user?.isInsured ? 'Insurance Expired' :
    !user?.isActive ? 'Account Suspended' : null);

  const generateQR = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/id/token', {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to refresh signed ID token');
      }

      const data = await response.json();
      const url = await QRCode.toDataURL(data.token, {
        width: 200,
        margin: 2,
        color: { dark: isLocked ? '#EF4444' : '#00F5FF', light: '#121212' },
      });
      setQrCodeUrl(url);
      setCountdown(REFRESH_INTERVAL);
      setRefreshError('');
    } catch (err) {
      console.error('QR generation failed:', err);
      setRefreshError('Unable to refresh signed QR. Reconnect and try again.');
    }
  };

  useEffect(() => {
    if (user) generateQR();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user]);

  useEffect(() => {
    if (!user || isOffline) return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1000) {
          generateQR();
          return REFRESH_INTERVAL;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, isOffline]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return <div className="max-w-md mx-auto flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00F5FF]"></div></div>;
  }

  if (!user) {
    return <div className="max-w-md mx-auto text-center p-8"><p className="text-red-400">Unable to load user data</p></div>;
  }

  const insuranceStatus = user.isInsured && user.insuranceExpiry
    ? `Valid until ${new Date(user.insuranceExpiry).toLocaleDateString()}`
    : 'Not insured / Expired';

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">Digital Player ID</h1>

      {isOffline && (
        <div className="mb-4 glass-card p-3 flex items-center gap-2 bg-yellow-500/20 border-yellow-500/50">
          <WifiOff size={18} className="text-yellow-400" />
          <span className="text-yellow-400 text-sm">Offline Mode. Last synced {lastSynced ? Math.floor((Date.now() - lastSynced.getTime()) / 60000) : 0}m ago</span>
        </div>
      )}

      <div className={`glass-card p-6 relative overflow-hidden ${isLocked ? 'status-locked' : 'status-active'}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-red-900/90 flex items-center justify-center z-20">
            <div className="text-center p-6">
              <CreditCard size={64} className="mx-auto mb-4 text-red-400" />
              <p className="text-2xl font-bold text-red-300">LOCKED</p>
              <p className="text-sm text-red-200 mt-2">{lockReason}</p>
              <a href="/dashboard/payments" className="mt-4 inline-block btn-primary bg-red-600 hover:bg-red-500">Pay Now</a>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          <div className={`w-20 h-20 rounded-full overflow-hidden border-2 ${!isLocked ? 'border-[#00F5FF]' : 'border-red-500'}`}>
            {user.photoUrl ? <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700 flex items-center justify-center"><span className="text-2xl text-gray-400">{user.fullName?.charAt(0) || '?'}</span></div>}
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${!isLocked ? 'verified' : ''}`}>{user.fullName}</h2>
            <p className="text-secondary text-sm">{user.role}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${!isLocked ? 'status-active' : 'status-locked'}`}>{!isLocked ? 'Active' : 'Locked'}</div>
        </div>

        <div className="flex justify-center mb-4">
          <div className="glass-card p-4 w-48 h-48 flex items-center justify-center">
            <div className="text-center">
              {qrCodeUrl ? <img src={qrCodeUrl} alt="Player QR Code" className="w-32 h-32 mx-auto" /> : <div className="w-32 h-32 mx-auto border-2 border-dashed border-[#00F5FF] rounded-lg flex items-center justify-center"><span className="text-[#00F5FF] text-4xl font-bold">...</span></div>}
              {!isOffline && <div className="flex items-center justify-center gap-1 mt-2 text-xs text-secondary"><Clock size={12} /><span>Refreshes in {Math.ceil(countdown / 1000)}s</span></div>}
            </div>
          </div>
        </div>

        {refreshError && (
          <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
            {refreshError}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3"><Shield size={18} className={user.isInsured ? 'text-green-400' : 'text-red-400'} /><div><p className="text-xs text-secondary">Insurance</p><p className={user.isInsured ? 'text-green-400' : 'text-red-400'}>{insuranceStatus}</p></div></div>
          <div className="flex items-center gap-3">{user.backgroundCheckStatus === 'CLEAR' ? <CheckCircle size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-yellow-400" />}<div><p className="text-xs text-secondary">Background Check</p><p className={user.backgroundCheckStatus === 'CLEAR' ? 'text-green-400' : 'text-yellow-400'}>{user.backgroundCheckStatus}</p></div></div>
          <div className="flex items-center gap-3"><CreditCard size={18} className="text-[#00F5FF]" /><div><p className="text-xs text-secondary">Player ID</p><p className="font-mono text-[#00F5FF] text-sm">{user.id}</p></div></div>
        </div>
      </div>

      <div className="mt-6 glass-card p-4">
        <h3 className="font-semibold mb-2">How to Use</h3>
        <ul className="text-sm text-secondary space-y-1">
          <li>Show this QR code at check-in</li>
          <li>QR refreshes every 60 seconds using a signed server token</li>
          <li>Refs and admins can validate it at the scanner screen</li>
        </ul>
        <a href="/dashboard/scan" className="mt-4 inline-flex items-center gap-2 text-sm text-[#00F5FF] hover:text-white">
          <ScanLine size={14} />
          Open scanner
        </a>
      </div>
    </div>
  );
}
