'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';
import { getPrimaryDashboardLinks, getVisibleDashboardNavGroups } from '@/lib/dashboard-nav';

function isItemActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSessionUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navGroups = useMemo(() => getVisibleDashboardNavGroups(user?.role), [user?.role]);
  const quickLinks = useMemo(() => getPrimaryDashboardLinks(user?.role), [user?.role]);

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="flex min-h-screen">
        <aside
          className={`hidden border-r border-white/10 bg-slate-950/70 backdrop-blur-xl lg:flex lg:flex-col ${
            sidebarCollapsed ? 'lg:w-24' : 'lg:w-80'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className={`${sidebarCollapsed ? 'hidden' : 'block'}`}>
              <Link href="/dashboard" className="text-xl font-bold text-cyan-300">
                League OS
              </Link>
              <p className="mt-1 text-sm text-white/45">Dashboard navigation</p>
            </div>
            <button
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-5">
              {navGroups.map((group) => (
                <section key={group.id} className="space-y-2">
                  {!sidebarCollapsed && (
                    <div className="px-3">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{group.label}</h2>
                      <p className="mt-1 text-xs text-white/25">{group.description}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = isItemActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                            active
                              ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/40'
                              : 'text-white/65 hover:bg-white/5 hover:text-white'
                          }`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <item.icon size={18} className={active ? 'text-cyan-300' : 'text-white/45 group-hover:text-white/75'} />
                          {!sidebarCollapsed && (
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{item.label}</div>
                              {item.description && (
                                <div className="truncate text-xs text-white/35 group-hover:text-white/45">{item.description}</div>
                              )}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/75 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open dashboard navigation"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <Link href="/dashboard" className="text-lg font-semibold text-white">
                    League Dashboard
                  </Link>
                  <div className="text-sm text-white/45">
                    {user ? `${user.fullName} · ${user.role}` : 'Loading session...'}
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-2 xl:flex">
                {quickLinks.map((item) => {
                  const active = isItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-full px-3 py-2 text-sm transition ${
                        active ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'bg-white/5 text-white/65 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm lg:hidden">
              <div className="absolute inset-y-0 left-0 w-[88vw] max-w-sm border-r border-white/10 bg-slate-950/95 p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-lg font-semibold text-white">Navigate</div>
                    <div className="text-sm text-white/40">{user?.fullName || 'League OS'}</div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70"
                    aria-label="Close dashboard navigation"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="space-y-5 overflow-y-auto pb-8">
                  {navGroups.map((group) => (
                    <section key={group.id} className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{group.label}</div>
                        <div className="mt-1 text-xs text-white/25">{group.description}</div>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = isItemActive(pathname, item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-start gap-3 rounded-xl px-3 py-3 ${
                                active ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'bg-white/5 text-white/70'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon size={18} className="mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">{item.label}</div>
                                {item.description && <div className="text-xs text-white/35">{item.description}</div>}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
