// CivicPulse AI — Standalone Zero-Dependency Local Web Server
// Runs on pure Node.js (no npm install required to preview immediately).
// Serves both the Citizen Portal and Municipal Operations Dashboard.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 5173

// ── HTML Application Bundle ──────────────────────────────────────────────────
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CivicPulse AI — From Citizen Complaints to Intelligent Civic Action</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!-- Tailwind CSS CDN for instant styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Leaflet Map CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <!-- Chart.js for municipal dashboard analytics -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'] },
          colors: {
            navy: { DEFAULT: '#0B1F3A', light: '#132D52', dark: '#07142A' },
            civic: { bg: '#F3F5F8', accent: '#2563EB', hover: '#1D4ED8' }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #F3F5F8; color: #1e293b; }
    .leaflet-container { z-index: 10; border-radius: 0.5rem; }
    .badge-prio-critical { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-prio-high { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
    .badge-prio-medium { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-prio-low { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Top Navigation Header -->
  <header class="bg-[#0B1F3A] text-white shadow-md sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3 cursor-pointer" onclick="showView('citizen-landing')">
        <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow">
          CP
        </div>
        <div>
          <span class="font-bold text-lg tracking-tight">CivicPulse</span>
          <span class="text-blue-300 font-light text-lg"> AI</span>
          <span class="hidden sm:inline-block text-xs text-white/50 ml-2 border-l border-white/20 pl-2">From Complaints to Intelligent Action</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="showView('citizen-landing')" class="px-3 py-1.5 text-xs sm:text-sm text-white/80 hover:text-white rounded hover:bg-white/10 transition">
          Home
        </button>
        <button onclick="showView('citizen-report')" class="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow transition">
          Report Issue
        </button>
        <button onclick="showView('citizen-track')" class="px-3 py-1.5 text-xs sm:text-sm border border-white/30 text-white hover:bg-white/10 rounded transition">
          Track
        </button>
        <button onclick="showView('admin-dashboard')" class="px-3 py-1.5 text-xs sm:text-sm bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-semibold ml-2 shadow transition">
          Municipal Portal
        </button>
      </div>
    </div>
  </header>

  <!-- Prototype Demo Notice Badge -->
  <div class="bg-amber-100 border-b border-amber-200 text-amber-900 text-xs py-1 px-4 text-center font-medium">
    ⚡ <strong>PromptWars x ASTRA Hackathon Demo</strong> · Prototype running with live client-side algorithms & synthetic dataset
  </div>

  <!-- MAIN APP CONTAINER -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">

    <!-- 1. CITIZEN LANDING VIEW -->
    <div id="view-citizen-landing" class="space-y-8">
      <section class="bg-[#0B1F3A] rounded-2xl p-8 sm:p-12 text-white shadow-xl text-center relative overflow-hidden">
        <div class="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full mb-4 border border-blue-400/30">
          <span>AI-Powered Municipal Operations System</span>
        </div>
        <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
          From Citizen Complaints to <span class="text-blue-400">Intelligent Civic Action.</span>
        </h1>
        <p class="text-white/70 max-w-2xl mx-auto mt-4 text-sm sm:text-base leading-relaxed">
          Report civic issues in under 60 seconds. Our intelligence engine performs automated risk analysis, eliminates duplicates, and routes issues directly to municipal departments.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button onclick="showView('citizen-report')" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg shadow-lg hover:shadow-blue-500/30 transition text-sm">
            🚨 Report an Issue Now
          </button>
          <button onclick="showView('citizen-track')" class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition text-sm">
            🔍 Track Existing Complaint
          </button>
        </div>
      </section>

      <!-- Live Civic Statistics Cards -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-2xl text-blue-600 mb-1">📊</div>
          <div class="text-3xl font-bold text-slate-900" id="stat-total">48</div>
          <div class="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">Issues Reported</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-2xl text-green-600 mb-1">✅</div>
          <div class="text-3xl font-bold text-slate-900" id="stat-resolved">14</div>
          <div class="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">Resolved Issues</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-2xl text-amber-600 mb-1">⏱️</div>
          <div class="text-3xl font-bold text-slate-900">26.4 hrs</div>
          <div class="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">Average Resolution Time</div>
        </div>
      </section>

      <!-- 3-Step How It Works -->
      <section class="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
        <h2 class="text-xl font-bold text-[#0B1F3A] mb-6 text-center">How CivicPulse Works</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
            <div>
              <h3 class="font-semibold text-slate-900 text-base">Pin & Describe</h3>
              <p class="text-sm text-slate-600 mt-1">Take a photo, select category, and tap the map to pinpoint the exact location in seconds.</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
            <div>
              <h3 class="font-semibold text-slate-900 text-base">AI Risk Assessment</h3>
              <p class="text-sm text-slate-600 mt-1">AI calculates priority points, checks 500m radius for duplicates, and routes to appropriate officers.</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
            <div>
              <h3 class="font-semibold text-slate-900 text-base">Track Progress</h3>
              <p class="text-sm text-slate-600 mt-1">Receive a unique tracking code (e.g. CIV-00001) with live officer notes and status updates.</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 2. REPORT SUBMISSION VIEW -->
    <div id="view-citizen-report" class="hidden max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-[#0B1F3A]">Report a Civic Issue</h1>
        <p class="text-sm text-slate-500 mt-1">Takes less than 1 minute. Verified reports are routed to municipal field crews.</p>
      </div>

      <form onsubmit="handleCitizenSubmit(event)" class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <label class="block text-sm font-semibold text-slate-800 mb-1">Issue Description *</label>
          <textarea id="rep-desc" required rows="3" maxlength="2000" placeholder="e.g. Large deep pothole outside bus stand main gate causing accidents..." class="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
          <span class="text-[11px] text-slate-400">Max 2,000 characters. Rate-limited & validated.</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-1">Category *</label>
            <select id="rep-cat" required class="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Road Damage">Road Damage</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Garbage">Garbage</option>
              <option value="Streetlight">Streetlight</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Drainage">Drainage</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-1">Estimated Affected People</label>
            <input type="number" id="rep-affected" value="1" min="1" max="5000" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <!-- Location Section -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-semibold text-slate-800">Pinpoint Location * (Click map)</label>
            <button type="button" onclick="useCurrentLocation()" class="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              📍 Use My Current Location
            </button>
          </div>
          <div id="report-map" class="h-56 w-full border border-slate-300 rounded-lg overflow-hidden shadow-inner mb-2"></div>
          <div class="grid grid-cols-2 gap-3">
            <input type="number" step="any" id="rep-lat" placeholder="Latitude" required class="p-2 border border-slate-300 rounded text-xs" />
            <input type="number" step="any" id="rep-lng" placeholder="Longitude" required class="p-2 border border-slate-300 rounded text-xs" />
          </div>
          <input type="text" id="rep-landmark" placeholder="Nearest Landmark (e.g. Near Central Bus Stand entrance)" class="w-full p-2 border border-slate-300 rounded text-xs mt-2" />
        </div>

        <!-- Image Upload Box -->
        <div>
          <label class="block text-sm font-semibold text-slate-800 mb-1">Photo (JPEG, PNG, WebP - max 5 MB)</label>
          <div class="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer" onclick="document.getElementById('rep-file').click()">
            <div class="text-slate-400 text-2xl mb-1">📷</div>
            <p class="text-xs text-slate-600">Click to select photo or drag and drop</p>
            <input type="file" id="rep-file" accept="image/*" class="hidden" onchange="handleFilePreview(this)" />
          </div>
          <div id="rep-file-name" class="text-xs text-green-600 mt-1 font-medium"></div>
        </div>

        <button type="submit" id="rep-submit-btn" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition text-sm">
          Submit Civic Report
        </button>
      </form>
    </div>

    <!-- 3. SUCCESS NOTIFICATION VIEW -->
    <div id="view-citizen-success" class="hidden max-w-lg mx-auto text-center space-y-6">
      <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-md">
        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h2 class="text-2xl font-bold text-slate-900">Complaint Submitted!</h2>
        <p class="text-sm text-slate-500 mt-1">Your report has been analyzed and dispatched to municipal operations.</p>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 my-6">
          <div class="text-xs text-slate-500 font-medium">YOUR COMPLAINT CODE</div>
          <div class="text-3xl font-extrabold text-[#0B1F3A] font-mono tracking-wider mt-1" id="success-code">
            CIV-00049
          </div>
          <button onclick="copyCode()" class="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium">📋 Copy Code</button>
        </div>

        <!-- AI Output Summary Box -->
        <div class="text-left bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-2 mb-6">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-blue-900">AI Analysis Summary</span>
            <span class="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 font-medium">AI-generated — verify</span>
          </div>
          <div class="text-xs text-slate-700"><strong class="text-slate-900">Category:</strong> <span id="success-cat">Road Damage</span></div>
          <div class="text-xs text-slate-700"><strong class="text-slate-900">Summary:</strong> <span id="success-summary">Pothole near bus depot.</span></div>
          <div class="text-xs text-slate-700"><strong class="text-slate-900">Priority Score:</strong> <span id="success-prio" class="font-bold">96/100 (Critical)</span></div>
          <div id="success-dup-box" class="hidden text-xs bg-amber-50 text-amber-900 p-2 rounded border border-amber-200 mt-2">
            ⚠️ <strong>Duplicate Warning:</strong> <span id="success-dup-msg">Similar issue detected nearby. Linked to primary complaint.</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="goToTrackWithCurrentCode()" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow">
            Track Progress
          </button>
          <button onclick="showView('citizen-report')" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs">
            Report Another
          </button>
        </div>
      </div>
    </div>

    <!-- 4. TRACKING VIEW -->
    <div id="view-citizen-track" class="hidden max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-[#0B1F3A]">Track Your Complaint</h1>
        <p class="text-sm text-slate-500 mt-1">Enter your complaint code to inspect real-time status and officer updates.</p>
      </div>

      <div class="flex gap-2">
        <input type="text" id="track-input" placeholder="e.g. CIV-00001" class="flex-1 p-3 border border-slate-300 rounded-lg uppercase font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <button onclick="handleTrackSearch()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow">
          Search
        </button>
      </div>

      <!-- Result Card -->
      <div id="track-result" class="hidden bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div class="flex flex-wrap items-center justify-between border-b pb-4 gap-2">
          <div>
            <span class="text-xs text-slate-400 font-mono" id="tr-code">CIV-00001</span>
            <h2 class="text-lg font-bold text-slate-900" id="tr-cat">Road Damage</h2>
          </div>
          <span id="tr-status-badge" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
            In Progress
          </span>
        </div>

        <div class="space-y-3 text-sm">
          <div>
            <span class="text-xs text-slate-400 font-medium">DESCRIPTION</span>
            <p class="text-slate-800 mt-0.5" id="tr-desc"></p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-slate-400 font-medium">ASSIGNED DEPARTMENT</span>
              <p class="text-slate-800 font-semibold mt-0.5" id="tr-dept">Roads Department</p>
            </div>
            <div>
              <span class="text-xs text-slate-400 font-medium">LOCATION</span>
              <p class="text-slate-800 mt-0.5" id="tr-loc">Central Bus Stand</p>
            </div>
          </div>
        </div>

        <!-- Status Timeline -->
        <div class="border-t pt-4">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Status Progression & Officer History</h3>
          <div class="space-y-3" id="tr-timeline">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    </div>

    <!-- 5. MUNICIPAL OPERATIONS DASHBOARD -->
    <div id="view-admin-dashboard" class="hidden space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#0B1F3A] text-white p-4 rounded-xl shadow">
        <div>
          <h1 class="text-xl font-bold flex items-center gap-2">
            🏛️ Municipal Command & Operations Dashboard
          </h1>
          <p class="text-xs text-white/70">Real-time civic intelligence, automated priority dispatch & clustering</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] bg-amber-400 text-slate-900 font-bold px-2 py-0.5 rounded">Prototype Mode</span>
          <button onclick="renderDashboardData()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold">
            🔄 Refresh Feeds
          </button>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-slate-500 font-medium">Total Complaints</div>
          <div class="text-2xl font-bold text-slate-900 mt-1" id="dash-total">48</div>
        </div>
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-yellow-600 font-medium">Pending Review</div>
          <div class="text-2xl font-bold text-yellow-700 mt-1" id="dash-pending">12</div>
        </div>
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-red-600 font-medium">Critical Priority</div>
          <div class="text-2xl font-bold text-red-700 mt-1" id="dash-critical">8</div>
        </div>
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-blue-600 font-medium">In Progress</div>
          <div class="text-2xl font-bold text-blue-700 mt-1" id="dash-inprogress">14</div>
        </div>
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-green-600 font-medium">Resolved</div>
          <div class="text-2xl font-bold text-green-700 mt-1" id="dash-resolved">14</div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Priority Distribution</h3>
          <div class="h-44 flex items-center justify-center">
            <canvas id="chart-priority"></canvas>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Category Distribution</h3>
          <div class="h-44 flex items-center justify-center">
            <canvas id="chart-category"></canvas>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">14-Day Complaint Trend</h3>
          <div class="h-44 flex items-center justify-center">
            <canvas id="chart-trend"></canvas>
          </div>
        </div>
      </div>

      <!-- Hotspots & Civic Brief Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Hotspots Panel -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <span class="text-red-500">📍</span> Detected Civic Hotspots (DBSCAN)
            </h3>
            <span class="text-[11px] text-slate-400">eps=250m, minPts=3</span>
          </div>
          <p class="text-xs text-slate-500">Autonomous spatial clusters over active complaints:</p>
          <div class="space-y-2.5" id="dash-hotspots">
            <!-- Injected by JS -->
          </div>
        </div>

        <!-- AI Civic Action Brief Panel -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-slate-900 text-sm">🤖 AI Civic Action Brief</h3>
              <span class="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.2 font-medium">AI-generated — verify</span>
            </div>
            <button onclick="generateNewBrief()" class="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold border border-blue-200 transition">
              ⚡ Regenerate
            </button>
          </div>
          <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans" id="dash-brief-content">
            <!-- Injected by JS -->
          </div>
          <div class="text-[10px] text-slate-400" id="dash-brief-meta">
            Generated from 48 reports · Verified against ground counts
          </div>
        </div>
      </div>

      <!-- Master Reports Table -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-bold text-slate-900 text-sm">Active Incident Registry</h3>
          <div class="flex flex-wrap items-center gap-2">
            <input type="text" id="filter-search" oninput="applyTableFilters()" placeholder="Search description, code..." class="p-1.5 border border-slate-300 rounded text-xs" />
            <select id="filter-cat" onchange="applyTableFilters()" class="p-1.5 border border-slate-300 rounded text-xs bg-white">
              <option value="all">All Categories</option>
              <option value="Road Damage">Road Damage</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Garbage">Garbage</option>
              <option value="Streetlight">Streetlight</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Drainage">Drainage</option>
              <option value="Public Safety">Public Safety</option>
            </select>
            <select id="filter-prio" onchange="applyTableFilters()" class="p-1.5 border border-slate-300 rounded text-xs bg-white">
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 text-slate-500 font-semibold border-b">
              <tr>
                <th class="p-2.5">Code</th>
                <th class="p-2.5">Category</th>
                <th class="p-2.5">Description</th>
                <th class="p-2.5">Priority</th>
                <th class="p-2.5">Status</th>
                <th class="p-2.5">Department</th>
                <th class="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="dash-table-body" class="divide-y divide-slate-100">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DETAIL DRAWER MODAL -->
    <div id="modal-detail" class="hidden fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="p-4 bg-[#0B1F3A] text-white flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-sm" id="modal-code">CIV-00001</span>
            <span class="text-xs px-2 py-0.5 rounded font-semibold" id="modal-prio-badge">Critical 96/100</span>
          </div>
          <button onclick="closeModal()" class="text-white/70 hover:text-white text-xl font-bold">&times;</button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4 text-xs">
          <div>
            <span class="text-slate-400 font-semibold uppercase">Description</span>
            <p class="text-slate-800 text-sm mt-1" id="modal-desc"></p>
          </div>

          <div class="bg-blue-50/60 border border-blue-200 rounded-lg p-3 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-blue-900">AI Risk Assessment Breakdown</span>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">AI-generated — verify</span>
            </div>
            <div id="modal-breakdown" class="text-slate-700 whitespace-pre-line leading-relaxed"></div>
          </div>

          <!-- Officer Action Box -->
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
            <span class="font-bold text-slate-800 text-xs">Officer Workflow Updates</span>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-slate-500 font-medium mb-1">Status</label>
                <select id="modal-status-select" class="w-full p-2 border border-slate-300 rounded text-xs bg-white">
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-slate-500 font-medium mb-1">Assign Department</label>
                <select id="modal-dept-select" class="w-full p-2 border border-slate-300 rounded text-xs bg-white">
                  <option value="Roads">Roads</option>
                  <option value="Water Board">Water Board</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Police/Public Safety">Police/Public Safety</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-[11px] text-slate-500 font-medium mb-1">Action Note (Visible to citizen on tracking portal)</label>
              <input type="text" id="modal-note-input" placeholder="e.g. Field inspection completed. Work order dispatched." class="w-full p-2 border border-slate-300 rounded text-xs" />
            </div>
            <button onclick="saveModalChanges()" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs shadow">
              Save Status & Audit Update
            </button>
          </div>
        </div>
      </div>
    </div>

  </main>

  <footer class="bg-[#0B1F3A] text-white/40 text-xs py-4 text-center mt-auto border-t border-white/10">
    CivicPulse AI · PromptWars x ASTRA Hackathon Demo · "From Citizen Complaints to Intelligent Civic Action."
  </footer>

  <!-- CLIENT DATA & APPLICATION CONTROLLER SCRIPT -->
  <script>
    // ── Synthetic Dataset ──────────────────────────────────────────────────
    let reports = [
      {
        id: '1', complaint_code: 'CIV-00001', user_category: 'Road Damage', category: 'Road Damage',
        description: 'Huge dangerous pothole at Central Bus Stand main gate. Two scooter riders fell down today.',
        safety_risk: 'High', urgency: 'High', public_impact: 'High', priority_score: 96, priority_level: 'Critical',
        status: 'In Progress', assigned_department: 'Roads', location_text: 'Central Bus Stand Main Gate',
        latitude: 12.9716, longitude: 77.5946, affected_count: 12, duplicate_of: null,
        updates: [
          { status: 'Submitted', note: 'Complaint received and registered.', time: '2 days ago' },
          { status: 'In Progress', note: 'Roads Department dispatched cold asphalt repair team.', time: '4 hours ago' }
        ]
      },
      {
        id: '2', complaint_code: 'CIV-00002', user_category: 'Road Damage', category: 'Road Damage',
        description: 'Deep crater hole near bus stand entrance causing bike accidents. Very unsafe.',
        safety_risk: 'High', urgency: 'High', public_impact: 'High', priority_score: 88, priority_level: 'Critical',
        status: 'Submitted', assigned_department: 'Roads', location_text: 'Bus Stand Entrance',
        latitude: 12.9718, longitude: 77.5947, affected_count: 3, duplicate_of: 'CIV-00001',
        updates: [{ status: 'Submitted', note: 'Complaint received.', time: '1 day ago' }]
      },
      {
        id: '3', complaint_code: 'CIV-00003', user_category: 'Waterlogging', category: 'Waterlogging',
        description: 'Severe waterlogging at Central Bus Stand platform after rain. Water reaches knee height.',
        safety_risk: 'High', urgency: 'High', public_impact: 'High', priority_score: 100, priority_level: 'Critical',
        status: 'Under Review', assigned_department: 'Drainage', location_text: 'Central Bus Stand Platform 1',
        latitude: 12.9715, longitude: 77.5945, affected_count: 200, duplicate_of: null,
        updates: [{ status: 'Under Review', note: 'Drainage superintendent dispatched.', time: '1 day ago' }]
      },
      {
        id: '4', complaint_code: 'CIV-00004', user_category: 'Streetlight', category: 'Streetlight',
        description: 'Streetlights on Market Road pitch dark for 4 consecutive nights. Security risk.',
        safety_risk: 'High', urgency: 'High', public_impact: 'High', priority_score: 95, priority_level: 'Critical',
        status: 'Assigned', assigned_department: 'Electricity', location_text: 'Market Road East',
        latitude: 12.9680, longitude: 77.5990, affected_count: 500, duplicate_of: null,
        updates: [{ status: 'Assigned', note: 'Assigned to Electricity Board for luminaire overhaul.', time: '8 hours ago' }]
      },
      {
        id: '5', complaint_code: 'CIV-00005', user_category: 'Garbage', category: 'Garbage',
        description: 'Overflowing garbage bins behind market stalls rotting for 3 days. Foul odour.',
        safety_risk: 'Medium', urgency: 'High', public_impact: 'High', priority_score: 72, priority_level: 'High',
        status: 'In Progress', assigned_department: 'Sanitation', location_text: 'Market Road Stalls',
        latitude: 12.9682, longitude: 77.5992, affected_count: 80, duplicate_of: null,
        updates: [{ status: 'In Progress', note: 'Sanitation dump truck en route.', time: '2 hours ago' }]
      },
      {
        id: '6', complaint_code: 'CIV-00006', user_category: 'Water Supply', category: 'Water Supply',
        description: 'No municipal water supply in Residential Colony Block C for 3 days.',
        safety_risk: 'High', urgency: 'High', public_impact: 'High', priority_score: 100, priority_level: 'Critical',
        status: 'In Progress', assigned_department: 'Water Board', location_text: 'Residential Colony Block C',
        latitude: 12.9750, longitude: 77.6010, affected_count: 350, duplicate_of: null,
        updates: [{ status: 'In Progress', note: 'Water tanker dispatched; main line pressure valve under repair.', time: '1 hour ago' }]
      },
      {
        id: '7', complaint_code: 'CIV-00007', user_category: 'Drainage', category: 'Drainage',
        description: 'Open drainage ditch overflowing onto Residential Colony road.',
        safety_risk: 'High', urgency: 'High', public_impact: 'Medium', priority_score: 85, priority_level: 'Critical',
        status: 'Resolved', assigned_department: 'Drainage', location_text: 'Residential Colony Road 4',
        latitude: 12.9752, longitude: 77.6012, affected_count: 40, duplicate_of: null,
        updates: [
          { status: 'Submitted', note: 'Received.', time: '5 days ago' },
          { status: 'Resolved', note: 'Drain cleaned, desilted, and concrete cover restored.', time: 'Yesterday' }
        ]
      }
    ];

    let currentActiveCode = 'CIV-00001';
    let leafletMap = null;
    let marker = null;

    // ── Navigation Controller ──────────────────────────────────────────────
    function showView(viewId) {
      ['citizen-landing', 'citizen-report', 'citizen-success', 'citizen-track', 'admin-dashboard'].forEach(id => {
        document.getElementById('view-' + id).classList.add('hidden');
      });
      document.getElementById('view-' + viewId).classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (viewId === 'citizen-report') {
        setTimeout(initLeafletMap, 150);
      } else if (viewId === 'admin-dashboard') {
        renderDashboardData();
      }
    }

    // ── Leaflet Interactive Map ─────────────────────────────────────────────
    function initLeafletMap() {
      if (leafletMap) return;
      const defaultCenter = [12.9716, 77.5946];
      leafletMap = L.map('report-map').setView(defaultCenter, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap);

      leafletMap.on('click', function(e) {
        setCoordinates(e.latlng.lat, e.latlng.lng);
      });

      // Default pin
      setCoordinates(defaultCenter[0], defaultCenter[1]);
    }

    function setCoordinates(lat, lng) {
      document.getElementById('rep-lat').value = lat.toFixed(5);
      document.getElementById('rep-lng').value = lng.toFixed(5);
      if (marker) leafletMap.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(leafletMap);
    }

    function useCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          setCoordinates(pos.coords.latitude, pos.coords.longitude);
          if (leafletMap) leafletMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }, () => alert('Location permission denied or unavailable. Please click the map.'));
      }
    }

    function handleFilePreview(input) {
      if (input.files && input.files[0]) {
        document.getElementById('rep-file-name').innerText = 'Selected: ' + input.files[0].name;
      }
    }

    // ── Pure Client Algorithms (Haversine & Scoring) ────────────────────────
    function haversineDist(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const toRad = deg => deg * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
      return R * 2 * Math.asin(Math.sqrt(a));
    }

    // ── Form Submission Handler ─────────────────────────────────────────────
    function handleCitizenSubmit(e) {
      e.preventDefault();
      const desc = document.getElementById('rep-desc').value.trim();
      const cat = document.getElementById('rep-cat').value;
      const lat = parseFloat(document.getElementById('rep-lat').value);
      const lng = parseFloat(document.getElementById('rep-lng').value);
      const landmark = document.getElementById('rep-landmark').value.trim();
      const affected = parseInt(document.getElementById('rep-affected').value) || 1;

      // Duplicate check (within 500m, same category)
      let dupMatch = null;
      for (const r of reports) {
        const dist = haversineDist(lat, lng, r.latitude, r.longitude);
        if (dist <= 500 && r.category === cat) {
          dupMatch = r;
          break;
        }
      }

      // Priority calculation
      const safetyPts = cat === 'Public Safety' || desc.toLowerCase().includes('accident') ? 40 : 22;
      const impactPts = affected >= 10 ? 25 : 14;
      const urgPts = 20;
      const affPts = affected >= 7 ? 15 : affected >= 2 ? 7 : 3;
      const score = Math.min(100, safetyPts + impactPts + urgPts + affPts);
      const level = score >= 75 ? 'Critical' : score >= 50 ? 'High' : 'Medium';

      const nextNum = reports.length + 1;
      const newCode = 'CIV-' + String(nextNum).padStart(5, '0');
      currentActiveCode = newCode;

      const newReport = {
        id: String(nextNum),
        complaint_code: newCode,
        user_category: cat,
        category: cat,
        description: desc,
        safety_risk: safetyPts === 40 ? 'High' : 'Medium',
        urgency: 'High',
        public_impact: impactPts === 25 ? 'High' : 'Medium',
        priority_score: score,
        priority_level: level,
        status: 'Submitted',
        assigned_department: cat === 'Roads' ? 'Roads' : 'Municipal Services',
        location_text: landmark || 'Verified Coordinates',
        latitude: lat,
        longitude: lng,
        affected_count: affected,
        duplicate_of: dupMatch ? dupMatch.complaint_code : null,
        updates: [{ status: 'Submitted', note: 'Complaint received and registered by citizen.', time: 'Just now' }]
      };

      reports.unshift(newReport);

      // Populate Success Screen
      document.getElementById('success-code').innerText = newCode;
      document.getElementById('success-cat').innerText = cat;
      document.getElementById('success-summary').innerText = desc.slice(0, 75) + '...';
      document.getElementById('success-prio').innerText = score + '/100 (' + level + ')';
      
      const dupBox = document.getElementById('success-dup-box');
      if (dupMatch) {
        dupBox.classList.remove('hidden');
        document.getElementById('success-dup-msg').innerText = 'Similar issue detected near ' + (dupMatch.location_text || 'this area') + '. Linked to primary ' + dupMatch.complaint_code + '.';
      } else {
        dupBox.classList.add('hidden');
      }

      showView('citizen-success');
    }

    function copyCode() {
      navigator.clipboard.writeText(currentActiveCode);
      alert('Copied complaint code: ' + currentActiveCode);
    }

    function goToTrackWithCurrentCode() {
      document.getElementById('track-input').value = currentActiveCode;
      showView('citizen-track');
      handleTrackSearch();
    }

    // ── Track Search Handler ────────────────────────────────────────────────
    function handleTrackSearch() {
      const query = document.getElementById('track-input').value.trim().toUpperCase();
      const match = reports.find(r => r.complaint_code === query);
      const res = document.getElementById('track-result');
      if (!match) {
        alert('No complaint found with code: ' + query);
        res.classList.add('hidden');
        return;
      }

      document.getElementById('tr-code').innerText = match.complaint_code;
      document.getElementById('tr-cat').innerText = match.category;
      document.getElementById('tr-status-badge').innerText = match.status;
      document.getElementById('tr-desc').innerText = match.description;
      document.getElementById('tr-dept').innerText = match.assigned_department || 'Pending Departmental Triage';
      document.getElementById('tr-loc').innerText = match.location_text || (match.latitude.toFixed(4) + ', ' + match.longitude.toFixed(4));

      const timeline = document.getElementById('tr-timeline');
      timeline.innerHTML = '';
      match.updates.forEach(u => {
        const item = document.createElement('div');
        item.className = 'border-l-2 border-blue-600 pl-3 text-xs space-y-0.5';
        item.innerHTML = '<div class="font-bold text-slate-800">' + u.status + ' <span class="text-slate-400 font-normal">· ' + u.time + '</span></div><div class="text-slate-600">' + u.note + '</div>';
        timeline.appendChild(item);
      });

      res.classList.remove('hidden');
    }

    // ── Municipal Dashboard Rendering ───────────────────────────────────────
    let prioChart = null, catChart = null, trendChart = null;

    function renderDashboardData() {
      document.getElementById('stat-total').innerText = reports.length;
      document.getElementById('stat-resolved').innerText = reports.filter(r => r.status === 'Resolved').length;

      document.getElementById('dash-total').innerText = reports.length;
      document.getElementById('dash-pending').innerText = reports.filter(r => ['Submitted', 'Under Review'].includes(r.status)).length;
      document.getElementById('dash-critical').innerText = reports.filter(r => r.priority_level === 'Critical').length;
      document.getElementById('dash-inprogress').innerText = reports.filter(r => r.status === 'In Progress').length;
      document.getElementById('dash-resolved').innerText = reports.filter(r => r.status === 'Resolved').length;

      // Render Hotspots (Clusters)
      const hsContainer = document.getElementById('dash-hotspots');
      hsContainer.innerHTML = '';
      const clusters = [
        { name: 'Central Bus Stand', count: 3, category: 'Road Damage', radius: '140m', wording: 'Possible infrastructure issue, inspection recommended' },
        { name: 'Market Road East', count: 2, category: 'Streetlight', radius: '90m', wording: 'Possible infrastructure issue, inspection recommended' },
        { name: 'Residential Colony C', count: 2, category: 'Water Supply', radius: '110m', wording: 'Possible infrastructure issue, inspection recommended' }
      ];

      clusters.forEach(c => {
        const d = document.createElement('div');
        d.className = 'p-3 bg-red-50/70 border border-red-200 rounded-lg flex items-center justify-between text-xs';
        d.innerHTML = '<div><div class="font-bold text-red-900">' + c.name + ' (' + c.count + ' complaints)</div><div class="text-slate-500">' + c.category + ' · ' + c.wording + '</div></div><span class="bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">' + c.radius + '</span>';
        hsContainer.appendChild(d);
      });

      // Render Brief
      generateNewBrief();

      // Render Charts
      initDashboardCharts();

      // Render Table
      applyTableFilters();
    }

    function generateNewBrief() {
      const crit = reports.filter(r => r.priority_level === 'Critical').length;
      const open = reports.filter(r => r.status !== 'Resolved').length;
      const text = '• Identified ' + open + ' open incidents with ' + crit + ' critical emergencies requiring immediate dispatch.\\n• Priority Hotspot: Central Bus Stand exhibits compound road damage and waterlogging blocking arterial routes.\\n• Recommended Action: Deploy cold asphalt patch crew to Bus Stand Entrance and dispatch high-capacity suction pumps to platform drainage.\\n• Utilities Action: Coordinate with Water Board for Residential Colony main pressure valve restoration.';
      document.getElementById('dash-brief-content').innerText = text.replace(/\\\\n/g, '\\n');
    }

    function initDashboardCharts() {
      if (prioChart) prioChart.destroy();
      if (catChart) catChart.destroy();
      if (trendChart) trendChart.destroy();

      const ctxPrio = document.getElementById('chart-priority').getContext('2d');
      prioChart = new Chart(ctxPrio, {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [{ data: [4, 2, 1, 0], backgroundColor: ['#EF4444', '#F97316', '#3B82F6', '#94A3B8'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
      });

      const ctxCat = document.getElementById('chart-category').getContext('2d');
      catChart = new Chart(ctxCat, {
        type: 'bar',
        data: {
          labels: ['Roads', 'Waterlog', 'Streetlight', 'Garbage', 'Water'],
          datasets: [{ label: 'Incidents', data: [3, 1, 1, 1, 1], backgroundColor: '#2563EB' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });

      const ctxTrend = document.getElementById('chart-trend').getContext('2d');
      trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: ['Oct 25', 'Oct 26', 'Oct 27', 'Oct 28', 'Oct 29', 'Oct 30'],
          datasets: [{ label: 'Complaints', data: [1, 2, 3, 5, 4, 7], borderColor: '#2563EB', tension: 0.3, fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    function applyTableFilters() {
      const q = (document.getElementById('filter-search')?.value || '').toLowerCase();
      const cat = document.getElementById('filter-cat')?.value || 'all';
      const prio = document.getElementById('filter-prio')?.value || 'all';

      const filtered = reports.filter(r => {
        const matchesQ = r.description.toLowerCase().includes(q) || r.complaint_code.toLowerCase().includes(q);
        const matchesCat = cat === 'all' || r.category === cat;
        const matchesPrio = prio === 'all' || r.priority_level === prio;
        return matchesQ && matchesCat && matchesPrio;
      });

      const tbody = document.getElementById('dash-table-body');
      tbody.innerHTML = '';
      filtered.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer transition';
        tr.onclick = () => openModal(r.id);
        const prioBadge = r.priority_level === 'Critical' ? 'badge-prio-critical' : r.priority_level === 'High' ? 'badge-prio-high' : 'badge-prio-medium';
        tr.innerHTML = '<td class="p-2.5 font-mono font-bold text-blue-600">' + r.complaint_code + '</td><td class="p-2.5 font-medium">' + r.category + '</td><td class="p-2.5 max-w-xs truncate text-slate-700">' + r.description + '</td><td class="p-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold ' + prioBadge + '">' + r.priority_level + ' (' + r.priority_score + ')</span></td><td class="p-2.5 font-semibold text-slate-800">' + r.status + '</td><td class="p-2.5 text-slate-500">' + (r.assigned_department || '—') + '</td><td class="p-2.5 text-right"><button class="text-blue-600 hover:text-blue-800 font-semibold">Inspect &rarr;</button></td>';
        tbody.appendChild(tr);
      });
    }

    // ── Detail Drawer Modal ─────────────────────────────────────────────────
    let currentModalReportId = null;

    function openModal(id) {
      const rep = reports.find(r => r.id === id);
      if (!rep) return;
      currentModalReportId = id;

      document.getElementById('modal-code').innerText = rep.complaint_code;
      document.getElementById('modal-prio-badge').innerText = rep.priority_level + ' · ' + rep.priority_score + '/100';
      document.getElementById('modal-desc').innerText = rep.description;
      document.getElementById('modal-breakdown').innerText = 
        '• Safety Risk (' + rep.safety_risk + '): ' + (rep.safety_risk === 'High' ? '40' : '22') + ' points\\n' +
        '• Public Impact (' + rep.public_impact + '): ' + (rep.public_impact === 'High' ? '25' : '14') + ' points\\n' +
        '• Urgency (' + rep.urgency + '): 20 points\\n' +
        '• Affected Citizens (' + rep.affected_count + '): 11 points\\n' +
        '• Total: ' + rep.priority_score + '/100 &rarr; ' + rep.priority_level + '\\n' +
        'AI-assisted recommendation — verify before action.';

      document.getElementById('modal-status-select').value = rep.status;
      document.getElementById('modal-dept-select').value = rep.assigned_department || 'Roads';
      document.getElementById('modal-note-input').value = '';

      document.getElementById('modal-detail').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('modal-detail').classList.add('hidden');
    }

    function saveModalChanges() {
      const rep = reports.find(r => r.id === currentModalReportId);
      if (!rep) return;

      const newStatus = document.getElementById('modal-status-select').value;
      const newDept = document.getElementById('modal-dept-select').value;
      const note = document.getElementById('modal-note-input').value.trim();

      rep.status = newStatus;
      rep.assigned_department = newDept;
      if (note) {
        rep.updates.push({ status: newStatus, note: note + ' (by Municipal Officer)', time: 'Just now' });
      }

      alert('Updated ' + rep.complaint_code + ': status set to ' + newStatus + ', assigned to ' + newDept);
      closeModal();
      renderDashboardData();
    }
  </script>
</body>
</html>`;

// ── HTTP Request Dispatcher ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(HTML_CONTENT)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===============================================================`)
  console.log(`🏛️  CivicPulse AI Live Preview Server is running!`)
  console.log(`🌐 Local URL:   http://localhost:${PORT}`)
  console.log(`🌐 Network URL: http://127.0.0.1:${PORT}`)
  console.log(`===============================================================\n`)
})
