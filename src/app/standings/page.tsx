import Link from 'next/link';

export const metadata = {
  title: 'Standings | League OS',
};

export default function StandingsPage() {
  const divisions = [
    {
      name: 'Premier Division',
      teams: [
        { name: 'Thunder FC', played: 12, won: 9, drawn: 2, lost: 1, points: 29, gd: 18 },
        { name: 'Velocity SC', played: 12, won: 8, drawn: 3, lost: 1, points: 27, gd: 15 },
        { name: 'Apex United', played: 12, won: 7, drawn: 2, lost: 3, points: 23, gd: 8 },
        { name: 'Phoenix FC', played: 12, won: 6, drawn: 3, lost: 3, points: 21, gd: 5 },
        { name: 'Titan FC', played: 12, won: 4, drawn: 2, lost: 6, points: 14, gd: -3 },
        { name: 'Blaze SC', played: 12, won: 2, drawn: 1, lost: 9, points: 7, gd: -12 },
      ]
    },
    {
      name: 'Compete Division',
      teams: [
        { name: 'Eagle Rangers', played: 10, won: 7, drawn: 2, lost: 1, points: 23, gd: 12 },
        { name: 'Wolf Pack', played: 10, won: 6, drawn: 3, lost: 1, points: 21, gd: 9 },
        { name: 'Hawk City', played: 10, won: 5, drawn: 2, lost: 3, points: 17, gd: 4 },
        { name: 'Panther FC', played: 10, won: 3, drawn: 1, lost: 6, points: 10, gd: -5 },
        { name: 'Sharks SC', played: 10, won: 1, drawn: 0, lost: 9, points: 3, gd: -20 },
      ]
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">League Standings</h1>

        {divisions.map((division) => (
          <div key={division.name} className="mb-10">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#00F5FF' }}>{division.name}</h2>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Pos</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Team</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">P</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">W</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">D</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">L</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">GD</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {division.teams.map((team, idx) => (
                    <tr key={team.name} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className={`font-bold ${idx < 3 ? 'text-green-400' : 'text-gray-400'}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{team.name}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.played}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.won}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.drawn}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.lost}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                      <td className="px-4 py-3 text-center font-bold text-cyan-400">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
