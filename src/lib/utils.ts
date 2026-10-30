// Utility helpers used across the app

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Priority, ReportStatus } from '@/types'

// shadcn/ui standard cn() helper — merges Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a date string to a readable locale string
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Format a date to a relative "2 days ago" style
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// Map priority level → Tailwind CSS class names
export function priorityClass(level: Priority | null | undefined): string {
  switch (level) {
    case 'Low':      return 'priority-low'
    case 'Medium':   return 'priority-medium'
    case 'High':     return 'priority-high'
    case 'Critical': return 'priority-critical'
    default:         return 'priority-low'
  }
}

// Map status → badge CSS class
export function statusClass(status: ReportStatus | null | undefined): string {
  switch (status) {
    case 'Submitted':    return 'status-submitted'
    case 'Under Review': return 'status-under-review'
    case 'Assigned':     return 'status-assigned'
    case 'In Progress':  return 'status-in-progress'
    case 'Resolved':     return 'status-resolved'
    default:             return 'status-submitted'
  }
}

// Truncate text to maxLen characters with ellipsis
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

// Format a number with commas: 12345 → "12,345"
export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

// Validate lat/lng are within reasonable bounds
export function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
