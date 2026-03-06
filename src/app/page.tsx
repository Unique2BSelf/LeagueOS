'use client';

import Link from "next/link";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Shield, 
  Trophy, 
  MessageSquare,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Team Management",
    description: "Create teams, manage rosters, and handle player registrations with ease."
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Fair round-robin scheduling with equity-weighted field and time distribution."
  },
  {
    icon: CreditCard,
    title: "Financial Automation",
    description: "Escrow-style payments, automatic fine billing, and Stripe integration."
  },
  {
    icon: Shield,
    title: "Anti-Ringer IDs",
    description: "Biometric player verification to ensure competitive integrity."
  },
  {
    icon: Trophy,
    title: "Live Match Center",
    description: "Real-time scoring, timers, and card management for referees."
  },
  {
    icon: MessageSquare,
    title: "Team Communication",
    description: "Integrated chat with division, team, and 1-on-1 messaging."
  }
];

const stats = [
  { value: "500+", label: "Active Players" },
  { value: "50+", label: "Teams" },
  { value: "1000+", label: "Matches Played" },
  { value: "99%", label: "Payment Recovery" }
];

export default function Home() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center gradient-radial overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse" />
            <span className="text-sm text-[#AAAAAA]">Now with 1099-NEC & Background Checks</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-[#E0E0E0]">The </span>
            <span className="text-[#00F5FF] text-glow">Operating System</span>
            <br />
            <span className="text-[#E0E0E0]">for Adult Soccer</span>
          </h1>
          
          <p className="text-xl text-[#AAAAAA] max-w-2xl mx-auto mb-10">
            Automate financial accountability, ensure competitive integrity, 
            and build community with the most complete league management platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Register Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/standings" className="btn-secondary text-lg px-8 py-4">
              View Standings
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="glass-card p-6">
                <div className="text-3xl md:text-4xl font-bold text-[#00F5FF] mb-2">{stat.value}</div>
                <div className="text-[#AAAAAA] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-[#E0E0E0]">Everything You Need to </span>
              <span className="text-[#00F5FF]">Run Your League</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card glass-card-hover p-8"
              >
                <div className="w-12 h-12 rounded-lg bg-[#00F5FF]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#00F5FF]" />
                </div>
                <h3 className="text-xl font-semibold text-[#E0E0E0] mb-3">{feature.title}</h3>
                <p className="text-[#AAAAAA]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/5 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6">
                <span className="text-[#E0E0E0]">Ready to </span>
                <span className="text-[#00F5FF]">Transform Your League?</span>
              </h2>
              <p className="text-[#AAAAAA] text-lg mb-8 max-w-xl mx-auto">
                Join hundreds of leagues already using League OS to manage their 
                adult recreational soccer operations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="btn-primary text-lg px-8 py-4">
                  Get Started Free
                </Link>
                <Link href="/schedule" className="btn-secondary text-lg px-8 py-4">
                  View Demo Schedule
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
