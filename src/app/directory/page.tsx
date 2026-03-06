import Link from 'next/link';
import { Search, MapPin, Phone, Star, Users } from 'lucide-react';

export const metadata = {
  title: 'Business Directory | League OS',
};

const businesses = [
  { id: '1', name: 'Smith Auto Repair', category: 'Automotive', discount: '15%', owner: 'John Smith', phone: '555-0101', address: '123 Main St' },
  { id: '2', name: 'Fitness First Gym', category: 'Health & Fitness', discount: '20%', owner: 'Jane Doe', phone: '555-0102', address: '456 Oak Ave' },
  { id: '3', name: 'Pino\'s Pizza', category: 'Restaurant', discount: '10%', owner: 'Mario Pino', phone: '555-0103', address: '789 Elm St' },
  { id: '4', name: 'Tech Solutions IT', category: 'Professional Services', discount: '15%', owner: 'Sarah Tech', phone: '555-0104', address: '321 Pine Rd' },
  { id: '5', name: 'Green Thumb Landscaping', category: 'Home Services', discount: '10%', owner: 'Tom Green', phone: '555-0105', address: '654 Maple Dr' },
  { id: '6', name: 'Kids Corner Daycare', category: 'Family Services', discount: '15%', owner: 'Lisa Kids', phone: '555-0106', address: '987 Cedar Ln' },
];

const categories = ['All', 'Automotive', 'Health & Fitness', 'Restaurant', 'Professional Services', 'Home Services', 'Family Services'];

export default function DirectoryPage() {
  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Business Directory</h1>
          <p className="text-gray-400 mt-1">Exclusive deals from League OS members • Show your ID to redeem</p>
        </div>

        {/* Search */}
        <div className="glass-card p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search businesses..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  cat === 'All' 
                    ? 'bg-cyan-500 text-black' 
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {businesses.map((biz) => (
            <div key={biz.id} className="glass-card p-5 hover:border-cyan-500/50 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{biz.name}</h3>
                  <p className="text-gray-400 text-sm">{biz.category}</p>
                </div>
                <div className="text-center px-3 py-1 rounded-lg bg-green-500/20 border border-green-500">
                  <div className="text-green-400 font-bold">{biz.discount}</div>
                  <div className="text-xs text-gray-400">OFF</div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> {biz.owner}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {biz.phone}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {biz.address}
                </div>
              </div>
              <button 
                className="w-full mt-4 py-2 rounded-lg font-semibold transition hover:opacity-90"
                style={{ background: '#00F5FF', color: '#121212' }}
              >
                Show Deal
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">List Your Business</h3>
          <p className="text-gray-400 text-sm mb-4">
            League OS members get exclusive deals at member-owned businesses. 
            Add yours to the directory and connect with other members!
          </p>
          <button 
            className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-90"
            style={{ background: '#00F5FF', color: '#121212' }}
          >
            Add Your Business
          </button>
        </div>
      </main>
    </div>
  );
}
