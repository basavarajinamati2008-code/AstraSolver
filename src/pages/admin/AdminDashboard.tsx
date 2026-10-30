// Admin Dashboard — overview cards, charts, hotspot map, civic brief
// Phase 7 charts are stubs here; they get filled in during that phase.
import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp, Layers,
  RefreshCw, Loader2, Bot, Zap, MapPin
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AiLabel } from '@/components/ui/ai-label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import type { Report, CivicBrief, Hotspot } from '@/types'
import { formatDate, priorityClass, statusClass, truncate } from '@/lib/utils'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts'

// ── Colour maps ──────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  Low:      '#94A3B8',
  Medium:   '#3B82F6',
  High:     '#F97316',
  Critical: '#EF4444',
}

// ── Overview stat card ───────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string; value: number | string; icon: React.ElementType; color: string; loading: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-md ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {loading ? <Skeleton className="h-8 w-20" /> : (
          <p className="text-3xl font-bold text-navy">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Interfaces for chart data ────────────────────────────────────────────────
interface OverviewStats {
  total: number; pending: number; critical: number; inProgress: number; resolved: number
}
interface TrendPoint { date: string; count: number }

export default function AdminDashboard() {
  const [stats, setStats]         = useState<OverviewStats | null>(null)
  const [recent, setRecent]       = useState<Report[]>([])
  const [priorityDist, setPrioDist] = useState<{ name: string; value: number }[]>([])
  const [categoryDist, setCatDist]  = useState<{ name: string; count: number }[]>([])
  const [trend, setTrend]         = useState<TrendPoint[]>([])
  const [hotspots, setHotspots]   = useState<Hotspot[]>([])
  const [brief, setBrief]         = useState<CivicBrief | null>(null)
  const [loading, setLoading]     = useState(true)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError]     = useState('')

  const loadDashboard = async () => {
    setLoading(true)

    // ── Fetch all reports (admin sees everything) ─────────────────────────
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (reports) {
      // Overview counts
      setStats({
        total:      reports.length,
        pending:    reports.filter(r => ['Submitted', 'Under Review'].includes(r.status)).length,
        critical:   reports.filter(r => r.priority_level === 'Critical').length,
        inProgress: reports.filter(r => r.status === 'In Progress').length,
        resolved:   reports.filter(r => r.status === 'Resolved').length,
      })

      // Recent: first 5
      setRecent(reports.slice(0, 5))

      // Priority distribution
      const prioCounts: Record<string, number> = {}
      reports.forEach(r => {
        const k = r.priority_level || 'Unknown'
        prioCounts[k] = (prioCounts[k] || 0) + 1
      })
      setPrioDist(Object.entries(prioCounts).map(([name, value]) => ({ name, value })))

      // Category distribution
      const catCounts: Record<string, number> = {}
      reports.forEach(r => {
        const k = r.category || r.user_category || 'Other'
        catCounts[k] = (catCounts[k] || 0) + 1
      })
      setCatDist(
        Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))
      )

      // Trend: last 14 days
      const today = new Date()
      const trendMap: Record<string, number> = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        trendMap[d.toISOString().slice(0, 10)] = 0
      }
      reports.forEach(r => {
        const day = r.created_at.slice(0, 10)
        if (day in trendMap) trendMap[day]++
      })
      setTrend(Object.entries(trendMap).map(([date, count]) => ({ date: date.slice(5), count })))
    }

    // ── Hotspots ────────────────────────────────────────────────────────
    const { data: hs } = await supabase.functions.invoke<Hotspot[]>('hotspots')
    if (hs) setHotspots(Array.isArray(hs) ? hs : [])

    // ── Latest brief (cached) ────────────────────────────────────────────
    const { data: briefs } = await supabase
      .from('briefs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
    if (briefs && briefs.length > 0) setBrief(briefs[0])

    setLoading(false)
  }

  useEffect(() => { loadDashboard() }, [])

  // Regenerate civic brief via Edge Function
  const regenerateBrief = async () => {
    setBriefLoading(true)
    setBriefError('')
    const { data, error } = await supabase.functions.invoke<CivicBrief>('civic-brief')
    if (error || !data) {
      setBriefError('Failed to generate brief. Check Edge Function logs.')
    } else {
      setBrief(data)
    }
    setBriefLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Dashboard</h1>
        <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Overview cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total"       value={stats?.total ?? 0}      icon={Layers}       color="bg-slate-500"         loading={loading} />
        <StatCard title="Pending"     value={stats?.pending ?? 0}    icon={Clock}        color="bg-yellow-500"        loading={loading} />
        <StatCard title="Critical"    value={stats?.critical ?? 0}   icon={AlertTriangle} color="bg-red-500"          loading={loading} />
        <StatCard title="In Progress" value={stats?.inProgress ?? 0} icon={TrendingUp}   color="bg-orange-500"        loading={loading} />
        <StatCard title="Resolved"    value={stats?.resolved ?? 0}   icon={CheckCircle}  color="bg-green-500"         loading={loading} />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Priority donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={priorityDist} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {priorityDist.map(entry => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categoryDist} margin={{ left: -20, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Trend line */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Complaint Trend (14d)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trend} margin={{ left: -20, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent complaints ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No complaints yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map(r => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-medium text-civic-accent">{r.complaint_code}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityClass(r.priority_level)}`}>
                        {r.priority_level || 'Unscored'}
                      </span>
                    </div>
                    <p className="text-sm text-navy truncate">{truncate(r.description, 80)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.category || r.user_category} · {formatDate(r.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusClass(r.status)}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Hotspots ─────────────────────────────────────────────────────── */}
      {hotspots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Active Hotspots
            </CardTitle>
            <CardDescription className="text-xs">
              Clusters of 3+ open reports within 250 m. Not a confirmed cause.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hotspots.map((h, i) => (
                <div key={h.id ?? i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-md">
                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {h.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy">{h.label || `Cluster ${i + 1}`}</p>
                    <p className="text-xs text-muted-foreground">{h.dominant_category} · Avg priority {h.avg_priority?.toFixed(0)}</p>
                    <p className="text-xs text-red-700 mt-0.5 italic">{h.wording}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{h.radius_m?.toFixed(0)}m radius</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Civic Brief ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-civic-accent" />
                AI Civic Action Brief
              </CardTitle>
              {brief && (
                <CardDescription className="text-xs mt-1">
                  Generated from {brief.report_count} reports at {formatDate(brief.generated_at)}
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateBrief}
              disabled={briefLoading}
            >
              {briefLoading
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5 mr-1.5" />}
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {briefLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : briefError ? (
            <p className="text-sm text-destructive">{briefError}</p>
          ) : brief ? (
            <div>
              <AiLabel />
              <div className="mt-3 text-sm text-navy whitespace-pre-wrap leading-relaxed">
                {brief.text}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No brief generated yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={regenerateBrief}>
                Generate Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
