import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Rules | League OS',
}

export const dynamic = 'force-dynamic'

function formatContent(content: string) {
  return content.split('\n').map((line) => line.trim()).filter(Boolean)
}

export default async function RulesPage({
  searchParams,
}: {
  searchParams?: Promise<{ season?: string }>
}) {
  const params = (await searchParams) || {}
  const seasons = await prisma.season.findMany({
    where: { isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, startDate: true, endDate: true },
  })

  const selectedSeasonId = params.season || seasons[0]?.id || null
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null
  const document = selectedSeasonId
    ? await prisma.seasonRulesDocument.findUnique({
        where: { seasonId: selectedSeasonId },
      })
    : null

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{document?.title || 'League Rules'}</h1>
            <p className="text-gray-400">
              {selectedSeason ? selectedSeason.name : 'No season selected'}
              {document?.effectiveDate ? ` · Effective ${new Date(document.effectiveDate).toLocaleDateString()}` : ''}
            </p>
            {document?.summary ? <p className="mt-3 text-gray-300">{document.summary}</p> : null}
          </div>

          <form action="/rules" method="get" className="glass-card p-4">
            <label htmlFor="season" className="block text-white/70 text-sm mb-2">Season</label>
            <div className="flex gap-3 items-center">
              <select
                id="season"
                name="season"
                defaultValue={selectedSeasonId || undefined}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary">View</button>
            </div>
          </form>
        </div>

        {!document ? (
          <div className="glass-card p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Rules not published yet</h2>
            <p className="text-gray-400 mb-4">League administrators have not published rules for this season yet.</p>
            <Link href="/register" className="btn-primary">Register Now</Link>
          </div>
        ) : (
          <div className="glass-card p-6">
            <div className="space-y-3">
              {formatContent(document.content).map((line, index) => {
                const isHeading = /^\d+[\.\)]\s/.test(line) || /^[A-Z][A-Za-z\s]+:$/.test(line)
                const isBullet = line.startsWith('- ') || line.startsWith('* ')

                if (isHeading) {
                  return (
                    <h2 key={`${index}-${line}`} className="pt-4 text-xl font-semibold text-cyan-300">
                      {line}
                    </h2>
                  )
                }

                if (isBullet) {
                  return (
                    <div key={`${index}-${line}`} className="flex items-start gap-3 text-gray-300">
                      <span className="mt-1 text-cyan-400">•</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  )
                }

                return (
                  <p key={`${index}-${line}`} className="text-gray-300">
                    {line}
                  </p>
                )
              })}
            </div>

            <div className="mt-8 border-l-4 border-amber-400 glass-card p-4">
              <p className="text-gray-400">
                <span className="font-semibold text-amber-400">Note:</span> League administrators may publish revisions during the season. Players will be notified of material changes through league communications.
              </p>
            </div>

            <div className="mt-8 text-center">
              <Link href="/register" className="inline-block rounded-lg px-8 py-3 font-semibold transition hover:opacity-90" style={{ background: '#00F5FF', color: '#121212' }}>
                Register Now
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
