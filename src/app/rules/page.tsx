import Link from 'next/link';

export const metadata = {
  title: 'Rules | League OS',
};

export default function RulesPage() {
  const sections = [
    {
      title: '1. General Conduct',
      rules: [
        'All players must register and be insured before participating in any match.',
        'Unsportsmanlike conduct, including violence, racism, or harassment, will result in immediate ejection and possible suspension.',
        'Teams are responsible for their spectators\' behavior.',
        'Alcohol and smoking are prohibited at all field facilities.',
      ]
    },
    {
      title: '2. Match Format',
      rules: [
        'Matches are two halves of 45 minutes with a 15-minute halftime.',
        'Teams must have a minimum of 7 players to start a match (11-a-side).',
        'Maximum of 3 substitutes allowed per match.',
        'All substitutions must be reported to the referee.',
      ]
    },
    {
      title: '3. Substitutions (1-Down/Any-Up)',
      rules: [
        'Players may move down one division level to play (e.g., Premier to Compete).',
        'Players may move up to any higher division with approval.',
        'Goalkeepers are exempt from division restrictions.',
        'Free agents are eligible for substitution once insured.',
      ]
    },
    {
      title: '4. Discipline & Red Cards',
      rules: [
        'A red card results in automatic suspension for the next match.',
        'Red card fines must be paid before the player\'s digital ID is unlocked.',
        'Multiple red cards in a season may result in extended suspension.',
        'Appeals must be submitted within 48 hours of the match.',
      ]
    },
    {
      title: '5. Forfeits',
      rules: [
        'A team with fewer than 5 rostered players will forfeit.',
        'Forfeiting teams may be fined and lose points.',
        'Repeated forfeits may result in removal from the league.',
        'Teams must provide 48-hour notice of any forfeit.',
      ]
    },
    {
      title: '6. Registration & Fees',
      rules: [
        'All players must complete registration including photo ID upload.',
        'Insurance must be renewed annually (365-day token required).',
        'Registration fees are non-refundable after the season starts.',
        'Captain credits and family discounts available upon approval.',
      ]
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">League Rules</h1>
        <p className="text-gray-400 mb-8">Spring Season 2026 • Effective January 1, 2026</p>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#00F5FF' }}>{section.title}</h2>
              <ul className="space-y-3">
                {section.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <span className="text-cyan-400 mt-1">▸</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 glass-card border-l-4 border-amber-400">
          <p className="text-gray-400">
            <span className="text-amber-400 font-semibold">Note:</span> Additional rules may be imposed by the league board. 
            All players will be notified of any changes via email and in-app notification.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/register" className="inline-block px-8 py-3 rounded-lg font-semibold transition hover:opacity-90" style={{ background: '#00F5FF', color: '#121212' }}>
            Register Now
          </Link>
        </div>
      </main>
    </div>
  );
}
