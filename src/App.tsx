import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'

// Citizen pages (public, no auth needed)
import LandingPage from '@/pages/citizen/LandingPage'
import ReportPage from '@/pages/citizen/ReportPage'
import TrackPage from '@/pages/citizen/TrackPage'
import SuccessPage from '@/pages/citizen/SuccessPage'

// Admin pages (Supabase Auth protected)
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminReports from '@/pages/admin/AdminReports'
import AdminReportDetail from '@/pages/admin/AdminReportDetail'

// Auth guard component
import { AuthGuard } from '@/components/admin/AuthGuard'

export default function App() {
  return (
    <BrowserRouter>
      {/* Toast notifications rendered at root so they appear above everything */}
      <Toaster />
      <Routes>
        {/* ── Citizen Portal (public) ────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/report/success" element={<SuccessPage />} />
        <Route path="/track" element={<TrackPage />} />

        {/* ── Admin (Supabase Auth protected) ──────────────────── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          {/* Default /admin → dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="reports/:id" element={<AdminReportDetail />} />
        </Route>

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
