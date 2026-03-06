'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, DollarSign } from 'lucide-react';

// Mock campaign data
const campaigns = [
  {
    id: '1',
    name: 'Spring Season Equipment Fund',
    goalAmount: 5000,
    current: 3250,
    description: 'Help us buy new goals, balls, and training equipment for the upcoming season.',
  },
  {
    id: '2',
    name: 'Field Improvement Project',
    goalAmount: 10000,
    current: 1500,
    description: 'We\'re raising funds to improve field drainage and add better lighting.',
  },
  {
    id: '3',
    name: 'Youth Scholarship Fund',
    goalAmount: 7500,
    current: 4200,
    description: 'Support scholarships for underprivileged youth to participate in our league.',
  },
];

export default function CampaignsPage() {
  const [showStripeAlert, setShowStripeAlert] = useState(false);

  const handleDonate = (campaignName: string) => {
    // Stub - shows "Stripe coming soon" alert
    setShowStripeAlert(true);
    setTimeout(() => setShowStripeAlert(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stripe Alert */}
      {showStripeAlert && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-900/90 border border-yellow-500 text-yellow-200 px-6 py-4 rounded-lg shadow-lg">
          <p className="font-semibold">Stripe Integration Coming Soon!</p>
          <p className="text-sm mt-1">Online donations will be available shortly.</p>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Fundraising Campaigns</h1>
        <p className="text-secondary">Support our league and help us grow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map(campaign => {
          const progress = (campaign.current / campaign.goalAmount) * 100;
          
          return (
            <div key={campaign.id} className="glass-card glass-card-hover p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 text-accent mb-3">
                <Heart size={20} />
                <span className="text-sm font-semibold">Active</span>
              </div>
              
              <h2 className="text-xl font-bold mb-2">{campaign.name}</h2>
              <p className="text-secondary text-sm mb-4 flex-grow">{campaign.description}</p>

              <div className="mb-2">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              <div className="flex justify-between text-sm mb-4">
                <span className="text-accent">${campaign.current.toLocaleString()} raised</span>
                <span className="text-secondary">${campaign.goalAmount.toLocaleString()} goal</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDonate(campaign.name)}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center"
                >
                  <DollarSign size={18} />
                  Donate Now
                </button>
                <Link href={`/campaigns/${campaign.id}`} className="btn-secondary px-4">
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-semibold mb-4">How Your Donation Helps</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/20 flex items-center justify-center">
              <Heart className="text-accent" size={24} />
            </div>
            <p className="font-semibold mb-1">Equipment</p>
            <p className="text-sm text-secondary">New gear for all players</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xl">⚽</span>
            </div>
            <p className="font-semibold mb-1">Fields</p>
            <p className="text-sm text-secondary">Better facilities</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xl">👶</span>
            </div>
            <p className="font-semibold mb-1">Scholarships</p>
            <p className="text-sm text-secondary">Inclusive access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
