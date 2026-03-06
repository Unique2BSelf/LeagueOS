import Link from 'next/link';
import { Calendar, MapPin, DollarSign, Clock, Users } from 'lucide-react';

export const metadata = {
  title: 'Referee Jobs | League OS',
};

// Mock available games
const games = [
  { id: '1', home: 'Thunder FC', away: 'Velocity SC', date: 'Sat, Mar 7', time: '10:00 AM', field: 'Field 1', division: 'Premier', pay: 75 },
  { id: '2', home: 'Apex United', away: 'Phoenix FC', date: 'Sat, Mar 7', time: '10:00 AM', field: 'Field 2', division: 'Premier', pay: 75 },
  { id: '3', home: 'Eagle Rangers', away: 'Wolf Pack', date: 'Sat, Mar 7', time: '12:00 PM', field: 'Field 3', division: 'Compete', pay: 60 },
  { id: '4', home: 'Titan FC', away: 'Blaze SC', date: 'Sat, Mar 7', time: '12:00 PM', field: 'Field 1', division: 'Premier', pay: 75 },
  { id: '5', home: 'Hawk City', away: 'Panther FC', date: 'Sun, Mar 8', time: '10:00 AM', field: 'Field 2', division: 'Compete', pay: 60 },
];

export default function RefJobsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Referee Job Board</h1>
            <p className="text-gray-400 mt-1">Select games to referee and earn extra income</p>
          </div>
          <div className="glass-card px-4 py-2">
            <span className="text-gray-400 text-sm">Available Games: </span>
            <span className="text-cyan-400 font-bold text-xl">{games.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {games.map((game) => (
            <div key={game.id} className="glass-card p-5 hover:border-cyan-500/50 transition">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">{game.date}</div>
                    <div className="text-lg font-bold text-white">{game.time}</div>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div>
                    <div className="text-lg font-semibold text-white">{game.home}</div>
                    <div className="text-gray-500">vs</div>
                    <div className="text-lg font-semibold text-white">{game.away}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="w-4 h-4" /> {game.field}
                    </div>
                    <div className="text-cyan-400 text-sm">{game.division}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-green-400 font-bold text-xl">
                      <DollarSign className="w-5 h-5" /> {game.pay}
                    </div>
                    <div className="text-gray-500 text-xs">Cash</div>
                  </div>
                  <button 
                    className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-90"
                    style={{ background: '#00F5FF', color: '#121212' }}
                  >
                    Claim Game
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">Referee Requirements</h3>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Must have valid certification uploaded
            </li>
            <li className="flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Background check must be cleared
            </li>
            <li className="flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Report to field 15 minutes before kickoff
            </li>
            <li className="flex items-center gap-2">
              <span className="text-cyan-400">▸</span> Submit match report within 4 hours
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
