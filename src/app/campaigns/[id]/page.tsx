'use client';

import { useState, useEffect } from 'react';
import { Heart, Users, Calendar, ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// Mock campaign data
const mockCampaigns = [
  {
    id: '1',
    name: 'Spring Season Equipment Fund',
    goalAmount: 5000,
    current: 3250,
    description: 'Help us buy new goals, balls, and training equipment for the upcoming season. Every donation helps!',
    endDate: new Date('2026-04-15'),
    createdAt: new Date('2026-01-15'),
    donorCount: 48,
  },
  {
    id: '2',
    name: 'Field Improvement Project',
    goalAmount: 10000,
    current: 1500,
    description: 'We\'re raising funds to improve field drainage and add better lighting for evening games.',
    endDate: new Date('2026-06-30'),
    createdAt: new Date('2026-02-01'),
    donorCount: 22,
  },
];

export default function CampaignPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<typeof mockCampaigns[0] | null>(null);
  const [donating, setDonating] = useState(false);
  const [donationComplete, setDonationComplete] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    // Find campaign by ID
    const found = mockCampaigns.find(c => c.id === params.id);
    if (found) {
      setCampaign(found);
    }
  }, [params.id]);

  const handleDonate = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount <= 0) return;

    setDonating(true);
    // Simulate Stripe checkout
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDonating(false);
    setDonationComplete(true);
  };

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
        <Link href="/" className="text-accent">Return Home</Link>
      </div>
    );
  }

  const progress = (campaign.current / campaign.goalAmount) * 100;
  const daysLeft = Math.ceil((campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const presetAmounts = [10, 25, 50, 100];

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="flex items-center gap-2 text-secondary mb-6">
        <ArrowLeft size={20} />
        Back to campaigns
      </Link>

      {donationComplete ? (
        <div className="glass-card p-8 text-center">
          <CheckCircle className="text-green-400 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-secondary mb-6">Your donation helps make this league possible.</p>
          <button onClick={() => setDonationComplete(false)} className="btn-secondary">
            Make Another Donation
          </button>
        </div>
      ) : (
        <>
          {/* Campaign Header */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 text-accent mb-2">
              <Heart size={20} />
              <span className="text-sm font-semibold">Fundraiser</span>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">{campaign.name}</h1>
            
            <p className="text-secondary mb-6">{campaign.description}</p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-accent font-semibold">${campaign.current.toLocaleString()}</span>
                <span className="text-secondary">of ${campaign.goalAmount.toLocaleString()}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-secondary" />
                <span className="text-secondary">{campaign.donorCount} donors</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-secondary" />
                <span className="text-secondary">{daysLeft} days left</span>
              </div>
            </div>
          </div>

          {/* Donation Form */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Make a Donation</h2>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presetAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedAmount === amount
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-sm text-secondary mb-2 block">Or enter custom amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  placeholder="Other amount"
                  className="pl-8"
                  min="1"
                />
              </div>
            </div>

            <button
              onClick={handleDonate}
              disabled={donating || (!selectedAmount && !customAmount)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {donating ? (
                <>Processing...</>
              ) : (
                <>
                  <CreditCard size={20} />
                  Donate {selectedAmount ? `$${selectedAmount}` : customAmount ? `$${customAmount}` : ''}
                </>
              )}
            </button>

            <p className="text-xs text-secondary text-center mt-4">
              🔒 Secure payment powered by Stripe
            </p>
          </div>
        </>
      )}
    </div>
  );
}
