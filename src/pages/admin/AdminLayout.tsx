// Admin Layout — persistent sidebar + header, wraps all /admin/* pages
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, LogOut, MapPin, Menu, X, Shield, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/reports',   label: 'Reports',   icon: ClipboardList },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-civic-accent rounded-lg flex items-center justify-center">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">CivicPulse AI</p>
            <p className="text-white/40 text-xs">Operations Centre</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'nav-link-active' : 'nav-link-inactive'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Prototype badge */}
      <div className="px-3 py-2">
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-md px-2 py-1.5 text-center">
          <p className="text-amber-300 text-xs font-medium">Prototype</p>
          <p className="text-amber-400/70 text-[10px]">synthetic demo data</p>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-civic-bg overflow-hidden">

      {/* ── Sidebar (desktop) ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-navy flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-navy flex-shrink-0">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Shield className="h-5 w-5 text-civic-accent" />
          <span className="font-semibold text-navy text-sm">Municipal Dashboard</span>
          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            PromptWars x ASTRA Demo
          </div>
        </header>

        {/* Page content (scrollable) */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
