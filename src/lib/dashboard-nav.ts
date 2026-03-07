import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  Home,
  Lock,
  MapPin,
  Megaphone,
  Shield,
  Ticket,
  User,
  Users,
} from 'lucide-react'

export type DashboardRole = 'ADMIN' | 'MODERATOR' | 'REF' | 'CAPTAIN' | 'PLAYER' | 'SPONSOR'

export type DashboardNavItem = {
  href: string
  label: string
  icon: LucideIcon
  description?: string
  roles?: DashboardRole[]
}

export type DashboardNavGroup = {
  id: string
  label: string
  description: string
  items: DashboardNavItem[]
}

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Core league entry points',
    items: [
      { href: '/dashboard', label: 'Dashboard Home', icon: Home, description: 'Your main league workspace' },
      { href: '/schedule', label: 'Schedule', icon: Calendar, description: 'Public schedule and match listing' },
      { href: '/teams', label: 'Teams', icon: Users, description: 'League teams and roster pages' },
      { href: '/standings', label: 'Standings', icon: BarChart3, description: 'Current table and rankings' },
    ],
  },
  {
    id: 'player',
    label: 'Player',
    description: 'Personal registration and eligibility',
    items: [
      { href: '/dashboard/id', label: 'Digital ID', icon: User, description: 'Player identity card' },
      { href: '/dashboard/insurance-status', label: 'Annual Insurance', icon: Shield, description: 'Required before season registration' },
      { href: '/dashboard/registrations', label: 'Season Registration', icon: ClipboardList, description: 'Register and track season status' },
      { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, description: 'Registration and payment history' },
      { href: '/dashboard/availability', label: 'Availability', icon: Calendar, description: 'Set match availability' },
      { href: '/dashboard/subs', label: 'Sub Requests', icon: Users, description: 'Request or claim substitutes' },
      { href: '/dashboard/files', label: 'Files', icon: FileText, description: 'Private documents and uploads' },
      { href: '/dashboard/background-check', label: 'Background Check', icon: Shield, description: 'Status and document uploads' },
    ],
  },
  {
    id: 'teams',
    label: 'Teams & Rosters',
    description: 'Team creation, join flow, and roster operations',
    items: [
      { href: '/dashboard/teams/create', label: 'Create Team', icon: Users, description: 'Create a team in a real season/division', roles: ['ADMIN', 'MODERATOR', 'CAPTAIN'] },
      { href: '/dashboard/teams/join', label: 'Join Team', icon: Users, description: 'Request roster approval or join by code' },
      { href: '/dashboard/teams/approve', label: 'Approve Teams', icon: ClipboardCheck, description: 'Admin approval for team entries', roles: ['ADMIN'] },
      { href: '/dashboard/users', label: 'Users & Rosters', icon: Users, description: 'Admin direct roster assignment and user ops', roles: ['ADMIN'] },
    ],
  },
  {
    id: 'league',
    label: 'League Ops',
    description: 'Season setup, scheduling, and registration controls',
    items: [
      { href: '/dashboard/seasons', label: 'Seasons & Divisions', icon: Calendar, description: 'Manage seasons, forms, and division structure', roles: ['ADMIN'] },
      { href: '/dashboard/locations', label: 'Fields & Locations', icon: MapPin, description: 'Facilities, fields, and map links for scheduling', roles: ['ADMIN'] },
      { href: '/dashboard/schedule-generator', label: 'Schedule Generator', icon: Calendar, description: 'Generate and persist season schedules', roles: ['ADMIN'] },
      { href: '/dashboard/registrations/approve', label: 'Approve Players', icon: ClipboardCheck, description: 'Registration approval queue', roles: ['ADMIN'] },
      { href: '/dashboard/discounts', label: 'Discount Codes', icon: Ticket, description: 'Registration discounts', roles: ['ADMIN'] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin & Reporting',
    description: 'Oversight, communications, and controls',
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: FileText, description: 'Insurance and registration compliance reports', roles: ['ADMIN'] },
      { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: History, description: 'Review sensitive system changes', roles: ['ADMIN'] },
      { href: '/dashboard/communications', label: 'Communications', icon: Megaphone, description: 'Email players, refs, teams, and seasons', roles: ['ADMIN'] },
      { href: '/dashboard/insurance', label: 'Insurance Admin', icon: Shield, description: 'Insurance records and overrides', roles: ['ADMIN'] },
      { href: '/dashboard/admin/locked', label: 'Locked Players', icon: Lock, description: 'Fine and eligibility locks', roles: ['ADMIN'] },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, description: 'League metrics and operational trends', roles: ['ADMIN'] },
      { href: '/dashboard/disciplinary', label: 'Disciplinary', icon: AlertTriangle, description: 'Cards, fines, and incidents', roles: ['ADMIN', 'MODERATOR'] },
    ],
  },
  {
    id: 'public-links',
    label: 'External',
    description: 'Public league surfaces',
    items: [
      { href: '/register', label: 'Public Register', icon: ExternalLink, description: 'Public registration form' },
      { href: '/rules', label: 'League Rules', icon: FileText, description: 'League rules and documents' },
    ],
  },
]

export function getVisibleDashboardNavGroups(role?: string | null) {
  return dashboardNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (role ? item.roles.includes(role as DashboardRole) : false)),
    }))
    .filter((group) => group.items.length > 0)
}

export function getPrimaryDashboardLinks(role?: string | null) {
  const groups = getVisibleDashboardNavGroups(role)
  return groups.flatMap((group) => group.items).slice(0, 6)
}
