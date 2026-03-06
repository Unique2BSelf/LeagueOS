'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ClientNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('league_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('league_user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#00B8FF] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#121212]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM4.5 10a5.5 5.5 0 1111 0 5.5 5.5 0 01-11 0z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-[#00F5FF]">League OS</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/' ? 'text-[#00F5FF]' : 'text-[#E0E0E0]'}`}>Home</Link>
            <Link href="/standings" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/standings' ? 'text-[#00F5FF]' : 'text-[#AAAAAA]'}`}>Standings</Link>
            <Link href="/schedule" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/schedule' ? 'text-[#00F5FF]' : 'text-[#AAAAAA]'}`}>Schedule</Link>
            <Link href="/rules" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/rules' ? 'text-[#00F5FF]' : 'text-[#AAAAAA]'}`}>Rules</Link>
            <Link href="/campaigns" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/campaigns' ? 'text-[#00F5FF]' : 'text-[#AAAAAA]'}`}>Fundraisers</Link>
            <Link href="/store" className={`hover:text-[#00F5FF] transition-colors ${pathname === '/store' ? 'text-[#00F5FF]' : 'text-[#AAAAAA]'}`}>Store</Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="hidden md:flex items-center gap-2 text-[#AAAAAA] hover:text-[#00F5FF] transition-colors">
                  <User size={18} />
                  <span className="text-sm">{user.fullName || user.email}</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 text-[#AAAAAA] hover:text-red-400 transition-colors text-sm"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-[#AAAAAA] hover:text-[#00F5FF] transition-colors text-sm">Login</Link>
                <Link href="/register" className="btn-primary text-sm">Register</Link>
              </>
            )}
            
            <button 
              className="md:hidden text-[#AAAAAA]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" className="block text-[#E0E0E0] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="/standings" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Standings</Link>
            <Link href="/schedule" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Schedule</Link>
            <Link href="/rules" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Rules</Link>
            <Link href="/campaigns" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Fundraisers</Link>
            <Link href="/store" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Store</Link>
            <hr className="border-white/10" />
            {user ? (
              <>
                <Link href="/dashboard" className="block text-[#00F5FF] font-semibold" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="block text-red-400 w-full text-left">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-[#AAAAAA] hover:text-[#00F5FF]" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link href="/register" className="block text-[#00F5FF] font-semibold" onClick={() => setMobileMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
