'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, User, CreditCard, Camera, Award, Users, Calendar, Settings, Shield, Heart, ShoppingCart, BarChart3, AlertTriangle, Menu, X, ChevronDown, FileText, Ticket, ClipboardList, DollarSign, ClipboardCheck, ExternalLink, Lock } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navGroups = [
    {
      id: 'public',
      label: 'Public',
      items: [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/schedule', icon: Calendar, label: 'Schedule' },
        { href: '/standings', icon: Users, label: 'Standings' },
      ]
    },
    {
      id: 'personal',
      label: 'Personal',
      items: [
        { href: '/dashboard/id', icon: User, label: 'My ID' },
        { href: '/dashboard/background-check', icon: Shield, label: 'Background' },
      ]
    },
    {
      id: 'league',
      label: 'League',
      items: [
        { href: '/teams', icon: Users, label: 'Teams' },
        { href: '/matches', icon: Calendar, label: 'Matches' },
        { href: '/dashboard/subs', icon: Users, label: 'Subs' },
        { href: '/dashboard/free-agents', icon: Users, label: 'Free Agents' },
        { href: '/dashboard/schedule-generator', icon: Calendar, label: 'Schedule Generator' },
        { href: '/dashboard/scan', icon: Camera, label: 'ID Scanner' },
        { href: '/dashboard/refs', icon: Award, label: 'Ref Dashboard' },
      ]
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { href: '/campaigns', icon: Heart, label: 'Donate' },
        { href: '/store', icon: ShoppingCart, label: 'Store' },
      ]
    },
    {
      id: 'registration',
      label: 'Registration',
      items: [
        { href: '/dashboard/seasons', icon: Calendar, label: 'Seasons & Forms' },
        { href: '/dashboard/registrations', icon: ClipboardList, label: 'All Registrations' },
        { href: '/dashboard/registrations/approve', icon: ClipboardCheck, label: 'Approve Players' },
        { href: '/dashboard/discounts', icon: Ticket, label: 'Discount Codes' },
        { href: '/dashboard/captain-credits', icon: DollarSign, label: 'Captain Credits' },
        { href: '/register', icon: ExternalLink, label: 'Public Register' },
        { href: '/rules', icon: FileText, label: 'League Rules' },
      ]
    },
    {
      id: 'admin',
      label: 'Admin',
      items: [
        { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
        { href: '/dashboard/users', icon: Users, label: 'Users' },
        { href: '/dashboard/ringers', icon: AlertTriangle, label: 'Ringers' },
        { href: '/dashboard/insurance', icon: Shield, label: 'Insurance' },
        { href: '/dashboard/schedule-generator', icon: Calendar, label: 'Schedule Generator' },
        { href: '/dashboard/scan', icon: Camera, label: 'ID Scanner' },
        { href: '/dashboard/refs', icon: Award, label: 'Ref Dashboard' },
        { href: '/dashboard/admin/locked', icon: Lock, label: 'Locked Players' },
      ]
    },
  ];

  const allNavItems = navGroups.flatMap(g => g.items);

  return (
    <div className="min-h-screen gradient-mesh">
      <header className="glass-nav py-4 px-4 sticky top-0 z-50">
        <div className="container flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-accent">
            League OS
          </Link>
          
          {/* Desktop Nav - Grouped */}
          <nav className="hidden lg:flex gap-1">
            {navGroups.map((group) => (
              <div 
                key={group.id}
                className="relative group"
              >
                <button 
                  className="nav-link flex items-center gap-1 px-3"
                  onMouseEnter={() => setActiveDropdown(group.id)}
                >
                  {group.label}
                  <ChevronDown size={14} />
                </button>
                
                <div 
                  className="absolute top-full left-0 mt-1 py-2 w-48 glass-card rounded-lg border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                  onMouseEnter={() => setActiveDropdown(group.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 ${pathname === item.href ? 'text-accent' : 'text-gray-300'}`}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            {navGroups.map((group) => (
              <div key={group.id} className="mb-4">
                <div className="text-xs uppercase text-white/40 px-4 mb-2">{group.label}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-white/10 ${pathname === item.href ? 'text-accent' : 'text-gray-300'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        )}
      </header>

      <main className="container py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 py-3 px-4 lg:hidden">
        <div className="flex justify-around">
          {allNavItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${pathname === item.href ? 'text-accent' : 'text-secondary'}`}
            >
              <item.icon size={20} />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
