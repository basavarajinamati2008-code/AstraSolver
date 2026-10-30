// Admin Reports page — searchable, filterable, sortable table of all complaints
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import type { Report } from '@/types'
import { CATEGORIES, STATUSES } from '@/types'
import { formatDate, priorityClass, statusClass, truncate } from '@/lib/utils'

type SortKey = 'created_at' | 'priority_score' | 'status'
type SortDir = 'asc' | 'desc'

const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical']

export default function AdminReports() {
  const navigate = useNavigate()
  const [reports, setReports]     = useState<Report[]>([])
  const [filtered, setFiltered]   = useState<Report[]>([])
  const [loading, setLoading]     = useState(true)

  // Filter/sort state
  const [search, setSearch]           = useState('')
  const [filterCat, setFilterCat]     = useState('all')
  const [filterPrio, setFilterPrio]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLocText, setFilterLocText] = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [sortKey, setSortKey]         = useState<SortKey>('created_at')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')

  // Fetch all reports once
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      setReports(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Apply filters whenever reports or filters change
  const applyFilters = useCallback(() => {
    let result = [...reports]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.description.toLowerCase().includes(q) ||
        r.complaint_code.toLowerCase().includes(q) ||
        (r.location_text || '').toLowerCase().includes(q)
      )
    }
    if (filterCat !== 'all')    result = result.filter(r => (r.category || r.user_category) === filterCat)
    if (filterPrio !== 'all')   result = result.filter(r => r.priority_level === filterPrio)
    if (filterStatus !== 'all') result = result.filter(r => r.status === filterStatus)
    if (filterLocText)          result = result.filter(r => (r.location_text || '').toLowerCase().includes(filterLocText.toLowerCase()))
    if (dateFrom)               result = result.filter(r => r.created_at >= dateFrom)
    if (dateTo)                 result = result.filter(r => r.created_at <= dateTo + 'T23:59:59')

    // Sort
    result.sort((a, b) => {
      let va: string | number = '', vb: string | number = ''
      if (sortKey === 'priority_score') { va = a.priority_score ?? -1; vb = b.priority_score ?? -1 }
      else if (sortKey === 'status')    { va = a.status; vb = b.status }
      else                              { va = a.created_at; vb = b.created_at }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    setFiltered(result)
  }, [reports, search, filterCat, filterPrio, filterStatus, filterLocText, dateFrom, dateTo, sortKey, sortDir])

  useEffect(() => { applyFilters() }, [applyFilters])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const resetFilters = () => {
    setSearch(''); setFilterCat('all'); setFilterPrio('all')
    setFilterStatus('all'); setFilterLocText('')
    setDateFrom(''); setDateTo('')
  }

  const exportToCSV = () => {
    if (filtered.length === 0) return

    const headers = [
      'Complaint Code',
      'Category',
      'User Category',
      'Description',
      'Priority Level',
      'Priority Score',
      'Status',
      'Department',
      'Latitude',
      'Longitude',
      'Landmark',
      'Affected Count',
      'Created At',
    ]

    const rows = filtered.map(r => [
      r.complaint_code,
      `"${(r.category || r.user_category || '').replace(/"/g, '""')}"`,
      `"${(r.user_category || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.priority_level || '',
      r.priority_score ?? '',
      r.status,
      `"${(r.assigned_department || '').replace(/"/g, '""')}"`,
      r.latitude,
      r.longitude,
      `"${(r.location_text || '').replace(/"/g, '""')}"`,
      r.affected_count,
      r.created_at,
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `civicpulse-reports-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">All Reports</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} of {reports.length} records shown</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* Search */}
            <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description, code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Category filter */}
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Priority filter */}
            <Select value={filterPrio} onValueChange={setFilterPrio}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Filter by location text…"
              value={filterLocText}
              onChange={e => setFilterLocText(e.target.value)}
            />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <div className="flex gap-2">
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={resetFilters} title="Reset filters">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No reports match the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Category</th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground whitespace-nowrap"
                      onClick={() => toggleSort('priority_score')}
                    >
                      <span className="flex items-center gap-1">Priority <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('status')}
                    >
                      <span className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground whitespace-nowrap"
                      onClick={() => toggleSort('created_at')}
                    >
                      <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(r => (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/reports/${r.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-civic-accent whitespace-nowrap">{r.complaint_code}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-navy">{truncate(r.description, 70)}</p>
                        {r.location_text && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{r.location_text}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{r.category || r.user_category}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityClass(r.priority_level)}`}>
                          {r.priority_level || '—'}
                          {r.priority_score != null && ` · ${r.priority_score}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
