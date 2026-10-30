// Small badge shown wherever AI-generated content appears
// Required by spec: "Everywhere AI results appear, show a small 'AI-generated — verify' label"
import { Bot } from 'lucide-react'

export function AiLabel() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      <Bot className="h-3 w-3" />
      AI-generated — verify
    </span>
  )
}
