// Track page — citizen enters complaint code and sees status + history
// Uses track_report RPC which is SECURITY DEFINER — cannot list other reports
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2, CheckCircle, Clock, AlertCircle, MapPin, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CitizenHeader } from '@/components/citizen/CitizenHeader'
import { AiLabel, AiFailedNotice } from '@/components/ui/ai-label'
import { supabase } from '@/lib/supabase'
import type { TrackResult, ReportStatus } from '@/types'
import { STATUSES } from '@/types'
import { formatDate, statusClass } from '@/lib/utils'

// ── Status timeline step ────────────────────────────────────────────────────
function StatusStep({ status, current }: { status: ReportStatus; current: ReportStatus }) {
  const allStatuses = STATUSES
  const currentIdx = allStatuses.indexOf(current)
  const stepIdx = allStatuses.indexOf(status)
  const isDone = stepIdx <= currentIdx
  const isCurrent = status === current

  return (
    <div className={`flex items-center gap-2 ${isDone ? 'text-navy' : 'text-muted-foreground'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
        ${isCurrent ? 'bg-civic-accent text-white' : isDone ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
        {isDone && !isCurrent ? <CheckCircle className="h-3.5 w-3.5" /> : stepIdx + 1}
      </div>
      <span className={`text-sm ${isCurrent ? 'font-semibold' : ''}`}>{status}</span>
    </div>
  )
}

export default function TrackPage() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-search if code is in URL params
  useEffect(() => {
    if (searchParams.get('code')) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription: update citizen view immediately when an officer updates status or notes
  useEffect(() => {
    if (!result?.id) return
    const channel = supabase
      .channel(`public:report:${result.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_updates', filter: `report_id=eq.${result.id}` },
        () => {
          handleSearch()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports', filter: `id=eq.${result.id}` },
        () => {
          handleSearch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!code.trim()) { setError('Please enter a complaint code.'); return }
    setError('')
    setResult(null)
    setLoading(true)

    // Call the SECURITY DEFINER RPC — returns only citizen-safe fields
    const { data, error: rpcError } = await supabase.rpc('track_report', {
      code: code.trim().toUpperCase()
    })

    if (rpcError) {
      setError('Could not fetch complaint. Check your code or try again later.')
      console.error(rpcError)
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      setError('No complaint found with that code. Please double-check and try again.')
    } else {
      setResult(Array.isArray(data) ? data[0] : data)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col">
      <CitizenHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-navy mb-2">Track My Complaint</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Enter your complaint code (e.g. <code className="bg-muted px-1 rounded">CIV-00001</code>) to view status.
        </p>

        {/* ── Search form ───────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            placeholder="Enter complaint code…"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="font-mono text-lg uppercase"
          />
          <Button type="submit" disabled={loading} className="bg-civic-accent hover:bg-civic-accent-hover px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* ── Result ────────────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4 animate-fade-in">

            {/* Status banner */}
            <Card className="border-2 border-civic-accent/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Complaint Code</p>
                    <p className="text-xl font-bold font-mono text-navy">{result.complaint_code}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusClass(result.status)}`}>
                    {result.status}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Issue details */}
            <Card>
              <CardHeader><CardTitle className="text-base">Issue Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-navy">{result.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Category (yours)</p>
                    <p className="font-medium">{result.user_category}</p>
                  </div>
                  {result.category && result.ai_status === 'success' && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">AI Category</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{result.category}</p>
                        <AiLabel />
                      </div>
                    </div>
                  )}
                </div>
                {result.ai_status === 'failed' && (
                  <AiFailedNotice reason="AI classification unavailable. A municipal officer will verify priority and routing manually." />
                )}
                {result.ai_summary && result.ai_status === 'success' && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">AI Summary <AiLabel /></p>
                    <p className="text-navy italic">"{result.ai_summary}"</p>
                  </div>
                )}
                {result.location_text && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{result.location_text}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Submitted: {formatDate(result.created_at)}
                </div>
              </CardContent>
            </Card>

            {/* Department */}
            {result.assigned_department && (
              <Card>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-civic-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-semibold text-navy">{result.assigned_department}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status timeline */}
            <Card>
              <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {STATUSES.map(s => <StatusStep key={s} status={s} current={result.status} />)}
                </div>

                {/* Officer notes from report_updates */}
                {result.updates && result.updates.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Officer Updates</p>
                    <div className="space-y-3">
                      {[...result.updates].reverse().map(u => (
                        <div key={u.id} className="text-sm">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(u.created_at)}
                            {u.new_status && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusClass(u.new_status as TrackResult['status'])}`}>
                                → {u.new_status}
                              </span>
                            )}
                          </div>
                          {u.action_note && <p className="text-navy">{u.action_note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
