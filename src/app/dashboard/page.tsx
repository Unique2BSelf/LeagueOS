'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Calendar, Shield, Users } from 'lucide-react'
import { useSessionUser } from '@/hooks/use-session-user'
import { getVisibleDashboardNavGroups } from '@/lib/dashboard-nav'

type InsuranceSummary = {
  hasActiveInsurance: boolean
}

export default function DashboardPage() {
  const { user, loading } = useSessionUser()
  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    fetch('/api/insurance', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load insurance')
        }
        return response.json()
      })
      .then(setInsuranceSummary)
      .catch(() => setInsuranceSummary(null))
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const navGroups = getVisibleDashboardNavGroups(user?.role)
  const heroLinks = navGroups.flatMap((group) => group.items).slice(0, 4)

  return (
    <div className="space-y-8">
      {user?.role === 'PLAYER' && insuranceSummary?.hasActiveInsurance === false && (
        <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 text-red-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Annual insurance required</h2>
                <p className="mt-1 text-sm text-red-100/85">
                  You cannot register for any season until your annual insurance is active.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/insurance-status"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Buy Insurance
            </Link>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_42%),linear-gradient(135deg,rgba(8,15,28,0.96),rgba(15,23,42,0.92))] p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-cyan-300/65">League OS</div>
            <h1 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">
              {user?.fullName ? `${user.fullName}, this is your league control room.` : 'League control room'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60 lg:text-base">
              The navigation is now organized by function instead of duplicated pages and mismatched dropdowns. Use the left rail for
              the full structure and the cards below for the most common league actions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {heroLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-cyan-300">
                <Users size={18} />
                <span className="text-sm font-medium">Teams</span>
              </div>
              <p className="mt-3 text-sm text-white/60">Team creation, roster approval, and direct admin roster assignment are grouped together.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-amber-300">
                <Calendar size={18} />
                <span className="text-sm font-medium">League Ops</span>
              </div>
              <p className="mt-3 text-sm text-white/60">Seasons, divisions, scheduling, and registration approvals now live in one lane.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-emerald-300">
                <Shield size={18} />
                <span className="text-sm font-medium">Admin Controls</span>
              </div>
              <p className="mt-3 text-sm text-white/60">Reporting, communications, insurance, and audit history are grouped under admin.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {navGroups.map((group) => (
          <div key={group.id} className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{group.label}</h2>
              <p className="mt-1 text-sm text-white/45">{group.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/8"
                >
                  <div className="flex items-center justify-between">
                    <item.icon size={18} className="text-cyan-300/90" />
                    <ArrowRight size={16} className="text-white/25 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
                  </div>
                  <div className="mt-4 text-sm font-medium text-white">{item.label}</div>
                  {item.description && <div className="mt-1 text-xs leading-5 text-white/40">{item.description}</div>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
