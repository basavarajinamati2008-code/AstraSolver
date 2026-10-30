// Citizen Portal — shared header/nav used on all citizen-facing pages
import { Link, useLocation } from 'react-router-dom'
import { MapPin, FileSearch, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CitizenHeader() {
  const loc = useLocation()
  return (
    <header className="bg-navy text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-90">
          <div className="w-8 h-8 bg-civic-accent rounded-lg flex items-center justify-center">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg leading-none">CivicPulse</span>
            <span className="text-blue-300 font-light"> AI</span>
          </div>
        </Link>

        {/* Nav buttons */}
        <nav className="flex items-center gap-2">
          {loc.pathname !== '/' && (
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                <Home className="h-4 w-4 mr-1" /> Home
              </Button>
            </Link>
          )}
          <Link to="/report">
            <Button size="sm" className="bg-civic-accent hover:bg-civic-accent-hover text-white">
              <MapPin className="h-4 w-4 mr-1" /> Report Issue
            </Button>
          </Link>
          <Link to="/track">
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
              <FileSearch className="h-4 w-4 mr-1" /> Track
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
