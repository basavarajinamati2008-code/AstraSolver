// AI metadata badge & failure state component
// Displays: model name, timestamp, "AI-generated, verify" label, and manual review state
import { Bot, AlertTriangle } from 'lucide-react'
import { CIVIC_CONFIG } from '../../../config/civicpulse.config'

interface AiLabelProps {
  model?: string
  timestamp?: string
  className?: string
}

export function AiLabel({ model = CIVIC_CONFIG.GEMINI_MODEL, timestamp, className = '' }: AiLabelProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap text-[11px] ${className}`}>
      <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
        <Bot className="h-3 w-3 text-amber-600" />
        AI-generated — verify
      </span>
      {model && (
        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
          {model}
        </span>
      )}
      {timestamp && (
        <span className="text-[10px] text-slate-400">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

export function AiFailedNotice({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs">
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">AI analysis unavailable — flagged for manual review</p>
        <p className="text-[11px] text-amber-700 mt-0.5">
          {reason || 'An officer will inspect the complaint and verify safety risk, category, and urgency.'}
        </p>
      </div>
    </div>
  )
}
