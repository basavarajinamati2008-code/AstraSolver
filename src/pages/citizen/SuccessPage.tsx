// Success page — shown after a complaint is submitted
// Displays complaint code, AI results (with verify label), and next steps
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Copy, FileSearch, MapPin, AlertCircle, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AiLabel } from '@/components/ui/ai-label'
import { CitizenHeader } from '@/components/citizen/CitizenHeader'
import { useToast } from '@/components/ui/toaster'
import type { SubmitReportResponse } from '@/types'
import { priorityClass } from '@/lib/utils'
import { useState } from 'react'

export default function SuccessPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // The result is passed via React Router state from ReportPage
  const result = location.state?.result as SubmitReportResponse | undefined

  // If someone navigates here directly without submitting, redirect home
  if (!result) {
    navigate('/')
    return null
  }

  const copyCode = () => {
    navigator.clipboard.writeText(result.complaint_code).then(() => {
      setCopied(true)
      toast({ title: 'Copied!', description: `${result.complaint_code} copied to clipboard.` })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const aiOk = result.ai_status === 'success'

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col">
      <CitizenHeader />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12">

        {/* ── Success banner ───────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Complaint Submitted!</h1>
          <p className="text-muted-foreground mt-2">
            Your report has been received. Use your complaint code to track progress.
          </p>
        </div>

        {/* ── Complaint code ───────────────────────────────────────────────── */}
        <Card className="mb-6 border-2 border-civic-accent/30">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Complaint Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-navy font-mono tracking-wider">
                {result.complaint_code}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                title="Copy to clipboard"
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Save this code — you'll need it to track your complaint.
            </p>
          </CardContent>
        </Card>

        {/* ── AI Analysis ──────────────────────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-civic-accent" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiOk ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <AiLabel />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Category</p>
                    <p className="font-medium">{result.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Priority</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(result.priority_level)}`}>
                      {result.priority_level || '—'}
                      {result.priority_score != null && ` (${result.priority_score}/100)`}
                    </span>
                  </div>
                </div>
                {result.summary && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Summary</p>
                    <p className="text-sm text-navy">{result.summary}</p>
                  </div>
                )}
                {result.duplicate_of && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Similar issue detected</p>
                      <p className="text-xs mt-0.5">{result.duplicate_reason}</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Confidence: {result.duplicate_confidence != null
                          ? `${(result.duplicate_confidence * 100).toFixed(0)}%`
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Submitted. AI analysis unavailable; an officer will review manually.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Next steps ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={`/track?code=${result.complaint_code}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <FileSearch className="h-4 w-4 mr-2" /> Track This Complaint
            </Button>
          </Link>
          <Link to="/report" className="flex-1">
            <Button className="w-full bg-civic-accent hover:bg-civic-accent-hover">
              <MapPin className="h-4 w-4 mr-2" /> Report Another Issue
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          A municipal officer will review and update your complaint status.
          Average response: 2–5 working days.
        </p>
      </main>
    </div>
  )
}
