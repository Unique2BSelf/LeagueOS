import Link from 'next/link';
import { Calendar, MapPin, Clock, Users, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Volunteer Opportunities | League OS',
};

const shifts = [
  { id: '1', role: 'ID Checker', event: 'Matchday', date: 'Sat, Mar 7', time: '9:00 AM - 1:00 PM', field: 'Field Complex', spots: 4, hours: 4 },
  { id: '2', role: 'Setup Crew', event: 'Field Prep', date: 'Sat, Mar 7', time: '7:00 AM - 10:00 AM', field: 'All Fields', spots: 8, hours: 3 },
  { id: '3', role: 'Scoreboard Operator', event: 'Matchday', date: 'Sun, Mar 8', time: '9:30 AM - 1:30 PM', field: 'Main Field', spots: 2, hours: 4 },
  { id: '4', role: 'Concessions', event: 'Matchday', date: 'Sat, Mar 7', time: '10:00 AM - 3:00 PM', field: 'Concessions', spots: 6, hours: 5 },
  { id: '5', role: 'Teardown Crew', event: 'Field Cleanup', date: 'Sat, Mar 7', time: '2:00 PM - 5:00 PM', field: 'All Fields', spots: 6, hours: 3 },
];

export default function VolunteerPage() {
  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Volunteer Opportunities</h1>
          <p className="text-gray-400 mt-1">Sign up for volunteer shifts • Track your community service hours</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">12</div>
            <div className="text-gray-400 text-sm">Your Hours</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">5</div>
            <div className="text-gray-400 text-sm">Shifts Completed</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">3</div>
            <div className="text-gray-400 text-sm">Upcoming</div>
          </div>
        </div>

        <div className="space-y-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="glass-card p-5 hover:border-cyan-500/50 transition">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{shift.role}</h3>
                  <div className="text-cyan-400 text-sm">{shift.event}</div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" /> {shift.date}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock className="w-4 h-4" /> {shift.time}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <MapPin className="w-4 h-4" /> {shift.field}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-cyan-400 font-bold">{shift.spots}</div>
                    <div className="text-gray-500 text-xs">spots left</div>
                  </div>
                  <button 
                    className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-90"
                    style={{ background: '#00F5FF', color: '#121212' }}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Earn {shift.hours} volunteer hours
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 glass-card p-5 border-l-4 border-green-500">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Volunteer Benefits
          </h3>
          <ul className="space-y-1 text-gray-400 text-sm">
            <li>• Earn community service hours for college applications</li>
            <li>• Free game admission to matches you volunteer at</li>
            <li>• Volunteer recognition at end-of-season banquet</li>
            <li>• Background check required for ID Checker role</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
