import Link from 'next/link';

export const metadata = {
  title: 'Schedule | League OS',
};

export default function SchedulePage() {
  const matches = [
    {
      date: 'Saturday, March 7',
      games: [
        { time: '10:00 AM', home: 'Thunder FC', away: 'Velocity SC', field: 'Field 1', division: 'Premier' },
        { time: '10:00 AM', home: 'Apex United', away: 'Phoenix FC', field: 'Field 2', division: 'Premier' },
        { time: '12:00 PM', home: 'Titan FC', away: 'Blaze SC', field: 'Field 1', division: 'Premier' },
        { time: '12:00 PM', home: 'Eagle Rangers', away: 'Wolf Pack', field: 'Field 3', division: 'Compete' },
        { time: '2:00 PM', home: 'Hawk City', away: 'Panther FC', field: 'Field 2', division: 'Compete' },
      ]
    },
    {
      date: 'Sunday, March 8',
      games: [
        { time: '10:00 AM', home: 'Velocity SC', away: 'Apex United', field: 'Field 1', division: 'Premier' },
        { time: '10:00 AM', home: 'Phoenix FC', away: 'Titan FC', field: 'Field 2', division: 'Premier' },
        { time: '12:00 PM', home: 'Blaze SC', away: 'Thunder FC', field: 'Field 1', division: 'Premier' },
        { time: '12:00 PM', home: 'Wolf Pack', away: 'Sharks SC', field: 'Field 3', division: 'Compete' },
      ]
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Match Schedule</h1>
        <p className="text-gray-400 mb-8">Spring Season 2026 • Matchday 13-14</p>

        {matches.map((day) => (
          <div key={day.date} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-white/10 pb-2">{day.date}</h2>
            <div className="space-y-3">
              {day.games.map((game, idx) => (
                <div key={idx} className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-cyan-400 font-mono font-bold">{game.time}</span>
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400">{game.division}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-1 justify-center">
                    <span className="text-white font-medium">{game.home}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-white font-medium">{game.away}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    <span className="text-cyan-400">{game.field}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 p-4 glass-card">
          <h3 className="text-white font-semibold mb-2">Venue</h3>
          <p className="text-gray-400">City Sports Complex • 1234 Athletic Way • Games are free to attend</p>
        </div>
      </main>
    </div>
  );
}
