'use client';

import { useState } from 'react';
import { Shield, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

type CheckStatus = 'NOT_INITIATED' | 'PENDING' | 'CLEAR' | 'FAIL';

interface BackgroundCheck {
  id: string;
  status: CheckStatus;
  provider: string;
  expiresAt?: Date;
  createdAt: Date;
}

export default function BackgroundCheckPage() {
  const [check, setCheck] = useState<BackgroundCheck | null>(null);
  const [loading, setLoading] = useState(false);

  const initiateCheck = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCheck({
      id: 'bg-' + Date.now(),
      status: 'PENDING',
      provider: 'Checkr',
      createdAt: new Date(),
    });
    setLoading(false);
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'CLEAR':
        return <CheckCircle className="text-green-400" size={24} />;
      case 'PENDING':
        return <Clock className="text-yellow-400" size={24} />;
      case 'FAIL':
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
        return 'status-locked';
      default:
        return 'bg-gray-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Background Check</h1>

      {/* Current Status */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Verification Status</h2>
          <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${getStatusColor(check?.status || 'NOT_INITIATED')}`}>
            {getStatusIcon(check?.status || 'NOT_INITIATED')}
            <span className="font-semibold">
              {check?.status || 'Not Initiated'}
            </span>
          </div>
        </div>

        {check && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Provider</span>
              <span>{check.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Initiated</span>
              <span>{check.createdAt.toLocaleDateString()}</span>
            </div>
            {check.expiresAt && (
              <div className="flex justify-between">
                <span className="text-secondary">Expires</span>
                <span>{check.expiresAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-semibold mb-4">Why Background Checks?</h3>
        <ul className="text-sm text-secondary space-y-2">
          <li>• Required for all referees and volunteers</li>
          <li>• Ensures safe environment for all players</li>
          <li>• Valid for 1 year from clearance date</li>
          <li>• League liability requirement</li>
        </ul>
      </div>

      {/* Action Button */}
      <div className="glass-card p-6">
        {check?.status === 'CLEAR' ? (
          <div className="text-center">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
            <p className="text-green-400 font-semibold">You are verified!</p>
            <p className="text-sm text-secondary mt-2">
              Your background check is valid until {check.expiresAt?.toLocaleDateString()}
            </p>
          </div>
        ) : check?.status === 'PENDING' ? (
          <div className="text-center">
            <Clock className="text-yellow-400 mx-auto mb-4 animate-pulse" size={48} />
            <p className="text-yellow-400 font-semibold">Check in progress...</p>
            <p className="text-sm text-secondary mt-2">
              This typically takes 1-2 business days
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Shield className="text-accent mx-auto mb-4" size={48} />
            <p className="mb-4">
              Initiate a background check to verify your identity
            </p>
            <button
              onClick={initiateCheck}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Processing...' : 'Initiate Background Check'}
            </button>
            <p className="text-xs text-secondary mt-4">
              Powered by Checkr. You'll be redirected to complete the process.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
