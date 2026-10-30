// Landing Page — first thing citizens see
// Shows branding, live stats, CTA buttons, and how-it-works steps
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, FileSearch, AlertTriangle, CheckCircle, Clock, ChevronRight, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CitizenHeader } from '@/components/citizen/CitizenHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import type { PublicStats } from '@/types'
import { formatNumber } from '@/lib/utils'

// ─── Stat card used in the live stats section ───────────────────────────────
function StatCard({ label, value, icon: Icon, loading }: {
  label: string; value: string | number; icon: React.ElementType; loading: boolean
}) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6 pb-4">
        <Icon className="h-6 w-6 text-civic-accent mx-auto mb-2" />
        {loading ? (
          <Skeleton className="h-8 w-16 mx-auto mb-1" />
        ) : (
          <p className="text-3xl font-bold text-navy">{value}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}

// ─── How-it-works step ─────────────────────────────────────────────────────
function HowStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-civic-accent text-white flex items-center justify-center font-bold text-lg">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-navy">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  useEffect(() => {
    // Call the SECURITY DEFINER RPC — returns aggregate counts only
    async function loadStats() {
      const { data, error } = await supabase.rpc('public_stats')
      if (error || !data) {
        console.error('Stats load failed:', error)
        setStatsError(true)
      } else {
        // data is an array with one row from the RPC
        setStats(Array.isArray(data) ? data[0] : data)
      }
      setStatsLoading(false)
    }
    loadStats()
  }, [])

  const avgResolution = stats?.avg_resolution_hours
    ? stats.avg_resolution_hours < 24
      ? `${Math.round(stats.avg_resolution_hours)}h`
      : `${(stats.avg_resolution_hours / 24).toFixed(1)}d`
    : '—'

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col">
      <CitizenHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-navy text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-6">
            <Wifi className="h-3.5 w-3.5 text-blue-300" />
            <span className="text-blue-200">Live civic intelligence platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            From Citizen Complaints to
            <span className="text-blue-300"> Intelligent Civic Action.</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
            CivicPulse AI uses artificial intelligence to instantly analyse your complaint,
            prioritise it automatically, detect similar issues in your area, and route it
            to the right municipal department — so problems get fixed faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/report">
              <Button size="lg" className="bg-civic-accent hover:bg-civic-accent-hover text-white w-full sm:w-auto">
                <MapPin className="h-5 w-5 mr-2" />
                Report an Issue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/track">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent w-full sm:w-auto">
                <FileSearch className="h-5 w-5 mr-2" />
                Track My Complaint
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Statistics ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full px-4 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Issues Reported" value={stats ? formatNumber(stats.total) : '—'} icon={AlertTriangle} loading={statsLoading} />
          <StatCard label="Resolved" value={stats ? formatNumber(stats.resolved) : '—'} icon={CheckCircle} loading={statsLoading} />
          <StatCard label="Avg Resolution" value={avgResolution} icon={Clock} loading={statsLoading} />
        </div>
        {statsError && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Live stats unavailable — check your Supabase connection.
          </p>
        )}
      </section>

      {/* ── How it Works ──────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full px-4 py-12">
        <h2 className="text-2xl font-bold text-navy mb-6 text-center">How It Works</h2>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <HowStep
              num={1}
              title="Describe Your Issue"
              desc="Fill in a short description, select a category, and pin the location on the map — takes under 60 seconds."
            />
            <HowStep
              num={2}
              title="AI Analyses & Prioritises"
              desc="Our AI instantly categorises your complaint, rates safety risk and urgency, detects similar nearby issues, and routes it to the right department."
            />
            <HowStep
              num={3}
              title="Track Progress"
              desc="Get a unique complaint code. Track status updates, see which department is working on it, and view officer notes — all in real time."
            />
          </CardContent>
        </Card>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-navy text-white/50 py-4 text-center text-xs">
        CivicPulse AI — PromptWars x ASTRA Hackathon · Demo prototype · All data is synthetic
      </footer>
    </div>
  )
}
