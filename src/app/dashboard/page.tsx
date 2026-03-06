'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  User, Shield, Heart, ShoppingCart, BarChart3, AlertTriangle, 
  Calendar, Users, MessageSquare, LogOut, Trophy, ChevronDown, ChevronRight, DollarSign
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    personal: true,
    league: true,
    finance: false,
    admin: false,
    communication: false,
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('league_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const handleLogout = () => {
    localStorage.removeItem('league_user')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const menuGroups = [
    {
      id: 'personal',
      label: 'Personal',
      icon: User,
      color: 'border-cyan-500/30',
      items: [
        { href: '/dashboard/id', icon: User, label: 'My ID', color: 'text-cyan-400' },
        { href: '/dashboard/background-check', icon: Shield, label: 'Background Check', color: 'text-green-400' },
      ]
    },
    {
      id: 'league',
      label: 'League',
      icon: Trophy,
      color: 'border-orange-500/30',
      items: [
        { href: '/teams', icon: Users, label: 'Teams', color: 'text-red-400' },
        { href: '/dashboard/teams/create', icon: Users, label: 'Create Team', color: 'text-green-400' },
        { href: '/dashboard/teams/join', icon: Users, label: 'Join Team', color: 'text-blue-400' },
        { href: '/dashboard/registrations', icon: Calendar, label: 'Register', color: 'text-yellow-400' },
        { href: '/dashboard/seasons', icon: Calendar, label: 'Seasons', color: 'text-cyan-400' },
        { href: '/dashboard/schedule-generator', icon: Calendar, label: 'Schedule Gen', color: 'text-orange-400' },
        { href: '/dashboard/availability', icon: Calendar, label: 'My Availability', color: 'text-cyan-400' },
        { href: '/matches', icon: Calendar, label: 'Match Center', color: 'text-orange-400' },
        { href: '/schedule', icon: Calendar, label: 'Schedule', color: 'text-cyan-400' },
        { href: '/standings', icon: Users, label: 'Standings', color: 'text-purple-400' },
        { href: '/dashboard/subs', icon: Users, label: 'Sub Requests', color: 'text-indigo-400' },
      ]
    },
    {
      id: 'finance',
      label: 'Finance & Fundraising',
      icon: Heart,
      color: 'border-pink-500/30',
      items: [
        { href: '/dashboard/payments', icon: DollarSign, label: 'Payments', color: 'text-green-400' },
        { href: '/campaigns', icon: Heart, label: 'Fundraisers', color: 'text-pink-400' },
        { href: '/store', icon: ShoppingCart, label: 'Store', color: 'text-purple-400' },
      ]
    },
    {
      id: 'admin',
      label: 'Admin & Security',
      icon: Shield,
      color: 'border-yellow-500/30',
      items: [
        { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', color: 'text-blue-400' },
        { href: '/dashboard/ringers', icon: AlertTriangle, label: 'Ringers', color: 'text-yellow-400' },
        { href: '/dashboard/disciplinary', icon: AlertTriangle, label: 'Disciplinary', color: 'text-red-400' },
        { href: '/volunteer', icon: Users, label: 'Volunteers', color: 'text-purple-400' },
        { href: '/dashboard/files', icon: Users, label: 'Files', color: 'text-cyan-400' },
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      color: 'border-teal-500/30',
      items: [
        { href: '/chat', icon: MessageSquare, label: 'Chat', color: 'text-teal-400' },
      ]
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-nav py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-cyan-400">League OS</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}!
          </h1>
          <p className="text-white/50">
            Manage your league activities from one place.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-cyan-400">0</div>
            <div className="text-white/50 text-sm">Matches Played</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-green-400">0</div>
            <div className="text-white/50 text-sm">Goals</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-purple-400">0</div>
            <div className="text-white/50 text-sm">Teams</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-orange-400">$0</div>
            <div className="text-white/50 text-sm">Balance</div>
          </div>
        </div>

        {/* Menu Groups */}
        <div className="space-y-4">
          {menuGroups.map((group) => (
            <div key={group.id} className={`glass-card border-l-4 ${group.color}`}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <group.icon className="w-5 h-5 text-white/70" />
                  <span className="text-lg font-semibold text-white">{group.label}</span>
                </div>
                {expandedGroups[group.id] ? (
                  <ChevronDown className="w-5 h-5 text-white/50" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/50" />
                )}
              </button>
              
              {expandedGroups[group.id] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-4">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="glass-card p-4 hover:bg-white/10 transition-colors group text-center"
                    >
                      <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color} group-hover:scale-110 transition-transform`} />
                      <div className="text-white text-sm font-medium">{item.label}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Upcoming Matches */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Upcoming Matches</h2>
          <div className="glass-card p-8 text-center">
            <Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/50">No upcoming matches</p>
            <Link href="/schedule" className="text-cyan-400 hover:underline mt-2 inline-block">
              View Schedule →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
