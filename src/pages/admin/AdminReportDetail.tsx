// Admin Report Detail — full view of one complaint with all AI fields and actions
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, AlertTriangle, Clock, Building2, CheckCircle,
  Edit3, Loader2, Image as ImageIcon, Bot, Copy, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { AiLabel } from '@/components/ui/ai-label'
import { supabase } from '@/lib/supabase'
import type { Report, ReportUpdate } from '@/types'
import { STATUSES, DEPARTMENTS } from '@/types'
import { formatDate, priorityClass, statusClass } from '@/lib/utils'
import { useToast } from '@/components/ui/toaster'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet icon paths (same fix as LocationPicker)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Risk label chip ──────────────────────────────────────────────────────────
function RiskChip({ label, level }: { label: string; level: string | null }) {
  const colour =
    level === 'High' ? 'bg-red-100 text-red-700 border-red-200' :
    level === 'Medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
    'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <div className={`border rounded-md px-2.5 py-1.5 text-center ${colour}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-semibold">{level || '—'}</p>
    </div>
  )
}

export default function AdminReportDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [report, setReport]   = useState<Report | null>(null)
  const [updates, setUpdates] = useState<ReportUpdate[]>([])
  const [loading, setLoading] = useState(true)

  // Action form state
  const [newStatus, setNewStatus]       = useState('')
  const [newDept, setNewDept]           = useState('')
  const [actionNote, setActionNote]     = useState('')
  const [saving, setSaving]             = useState(false)

  // Load report + history
  const loadReport = async () => {
    if (!id) return
    setLoading(true)

    const [{ data: rep }, { data: hist }] = await Promise.all([
      supabase.from('reports').select('*').eq('id', id).single(),
      supabase.from('report_updates').select('*').eq('report_id', id).order('created_at', { ascending: true }),
    ])

    if (rep) { setReport(rep); setNewStatus(rep.status); setNewDept(rep.assigned_department || '') }
    setUpdates(hist || [])
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [id])

  // Save status / department change + note
  const handleSave = async () => {
    if (!report) return
    setSaving(true)

    const changed = newStatus !== report.status || newDept !== (report.assigned_department || '')

    // Insert update row
    const { error: updErr } = await supabase.from('report_updates').insert({
      report_id:   report.id,
      old_status:  report.status,
      new_status:  newStatus || null,
      action_note: actionNote || null,
      updated_by:  'admin',
    })

    if (updErr) {
      toast({ title: 'Error', description: 'Failed to save update.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Update the report row
    if (changed || actionNote) {
      await supabase.from('reports').update({
        status:              newStatus,
        assigned_department: newDept || null,
        updated_at:          new Date().toISOString(),
      }).eq('id', report.id)
    }

    toast({ title: 'Saved', description: 'Report updated successfully.' })
    setActionNote('')
    await loadReport()
    setSaving(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  )

  if (!report) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Report not found.</p>
      <Button variant="outline" onClick={() => navigate('/admin/reports')} className="mt-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reports
      </Button>
    </div>
  )

  const breakdown = report.priority_breakdown

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/reports')}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> All Reports
      </Button>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-lg font-bold text-civic-accent">{report.complaint_code}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${priorityClass(report.priority_level)}`}>
              {report.priority_level || 'Unscored'}
              {report.priority_score != null && ` · ${report.priority_score}/100`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Submitted {formatDate(report.created_at)}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusClass(report.status)}`}>
          {report.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="md:col-span-2 space-y-5">

          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-navy leading-relaxed">{report.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  Citizen category: {report.user_category}
                </span>
                {report.location_text && (
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{report.location_text}
                  </span>
                )}
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {report.affected_count} affected
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-civic-accent" />
                AI Analysis
                {report.ai_status === 'success' && <AiLabel />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.ai_status === 'failed' ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                  AI analysis failed. Manual review required.
                  {report.ai_error && <p className="text-xs mt-1 opacity-70">{report.ai_error}</p>}
                </div>
              ) : report.ai_status === 'pending' ? (
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-700">
                  AI analysis in progress…
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Risk labels */}
                  <div className="grid grid-cols-3 gap-2">
                    <RiskChip label="Safety Risk" level={report.safety_risk} />
                    <RiskChip label="Urgency"     level={report.urgency} />
                    <RiskChip label="Public Impact" level={report.public_impact} />
                  </div>

                  {report.ai_summary && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
                      <p className="text-sm text-navy italic">"{report.ai_summary}"</p>
                    </div>
                  )}

                  {report.category && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI Category</p>
                      <p className="text-sm font-medium">{report.category}</p>
                    </div>
                  )}

                  {report.keywords && report.keywords.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.keywords.map(k => (
                          <span key={k} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.recommended_action && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
                      <p className="text-sm text-navy">{report.recommended_action}</p>
                      <p className="text-[10px] text-blue-600 mt-2 italic">
                        AI-assisted recommendation — verify before action.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority breakdown */}
          {breakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Priority Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  {(['safety', 'impact', 'urgency', 'affected'] as const).map(k => (
                    <div key={k} className="bg-muted/50 rounded-md p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">{k}</p>
                      <p className="text-lg font-bold text-navy">{breakdown[k]}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className={`text-lg font-bold px-2 py-0.5 rounded ${priorityClass(report.priority_level)}`}>
                    {breakdown.total}/100
                  </span>
                </div>
                {report.priority_explanation && (
                  <div className="mt-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed border-t pt-3">
                    {report.priority_explanation}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Duplicate info */}
          {report.duplicate_of && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm text-amber-700">Duplicate Detected</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-navy">{report.duplicate_reason}</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Primary report:</span>
                  <button
                    className="text-civic-accent text-xs hover:underline flex items-center gap-1"
                    onClick={() => navigate(`/admin/reports/${report.duplicate_of}`)}
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confidence: {report.duplicate_confidence != null
                    ? `${(report.duplicate_confidence * 100).toFixed(0)}%`
                    : '—'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Image */}
          {report.image_url && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Photo
              </CardTitle></CardHeader>
              <CardContent>
                <a href={report.image_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={report.image_url}
                    alt="Complaint photo"
                    className="w-full max-h-64 object-cover rounded-md hover:opacity-90 transition-opacity"
                  />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Mini map */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Location
            </CardTitle></CardHeader>
            <CardContent>
              <div className="h-48 rounded-md overflow-hidden border">
                <MapContainer
                  center={[report.latitude, report.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  dragging={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[report.latitude, report.longitude]} />
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: actions + history ────────────────────────────── */}
        <div className="space-y-5">

          {/* Actions panel */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2">
              <Edit3 className="h-4 w-4" /> Update Report
            </CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Change Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Assign Department</p>
                <Select value={newDept} onValueChange={setNewDept}>
                  <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Action Note (optional)</p>
                <Textarea
                  placeholder="Add a note visible to the citizen…"
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button
                className="w-full bg-civic-accent hover:bg-civic-accent-hover"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Save Update
              </Button>
            </CardContent>
          </Card>

          {/* Status history */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> History
            </CardTitle></CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No updates yet.</p>
              ) : (
                <div className="space-y-4">
                  {[...updates].reverse().map(u => (
                    <div key={u.id} className="text-xs border-l-2 border-muted pl-3">
                      <p className="text-muted-foreground mb-0.5">{formatDate(u.created_at)}</p>
                      {u.old_status && u.new_status && (
                        <p className="font-medium">
                          {u.old_status} → {u.new_status}
                        </p>
                      )}
                      {u.action_note && <p className="text-navy mt-1">{u.action_note}</p>}
                      {u.updated_by && <p className="text-muted-foreground text-[10px] mt-0.5">by {u.updated_by}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Synthetic data badge */}
          {report.is_synthetic && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700 font-medium">Synthetic demo record</p>
              <p className="text-xs text-amber-600 mt-0.5">This complaint is fictional test data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
