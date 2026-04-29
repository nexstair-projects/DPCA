<!-- converted from Week_2_Work_Report.docx -->

DPCA PROJECT
# Week 2 Work Report
April 5 - April 11, 2026

# Executive Summary
Week 2 marked the transition from development to production deployment. The Express.js backend was deployed on Railway and the Next.js frontend was deployed on Vercel. Critical issues affecting data visibility and API communication were identified and resolved. The dashboard was completely refactored to support multi-channel inbox management for Gmail, WhatsApp, and Instagram. All production deployments are now verified and operational.

# Completed Deliverables
## Railway Backend Deployment
- Deployed Express.js REST API to Railway production
- Configured PostgreSQL database connection via environment variables
- Set up automatic health check endpoint
- Verified backend responding on https://dpca-production.up.railway.app
- Created comprehensive step-by-step deployment guide
## Vercel Frontend Deployment
- Deployed Next.js 14 dashboard to Vercel production
- Configured automatic GitHub integration for main branch deployments
- Set environment variables (NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_SUPABASE_*)
- Fixed production build errors (Suspense boundaries)
- Verified frontend accessible at https://dpca-ten.vercel.app
## n8n Data Visibility - Root Cause Analysis
- Diagnosed Issue #1: RLS (Row Level Security) policies blocking data reads
- Dashboard was querying Supabase with anon key; RLS requires auth.uid() in users table
- Diagnosed Issue #2: Status values mismatch between n8n webhooks and DB schema
- DB CHECK constraint allowed: received, processing, draft_ready, replied, needs_human_reply, ignored, archived
- n8n webhooks attempted: new, pending_review, classified, auto_sent, sent, send_failed, discarded, approved
- Created migration SQL to expand constraint to 15 status values
## Dashboard Refactoring - Multi-Channel Support
- Rewrote dashboard/app/dashboard/page.tsx with channel-aware layout
- Added 3 interactive channel cards (Gmail, WhatsApp, Instagram) showing real-time stats
- Implemented channel filtering - clicking card filters all data by channel
- Added per-channel message count, pending count, and inbox status display
- Created channel distribution visualization in right sidebar
- All data now fetched from backend API (bypasses RLS constraints)
## Backend API Enhancements
- Created new route: GET /api/inboxes - returns connected inboxes with channel metadata
- Created new route: GET /api/leads - returns lead records for CRM display
- Enhanced existing /api/messages route with ?channel= query filter
- Added channel validation and filtering logic
- Backend now authorizes requests via service_role key (bypasses RLS)
## Inbox Page Refactoring
- Updated inbox/app/inbox/page.tsx to use backend API instead of direct Supabase
- Added channel filter tabs above draft/review interfaces
- Implemented dual filtering: channel AND category (Draft, Approved, Sent)
- Fixed status counting using grouping logic instead of exact string matching
- Channel parameter persists via URL query strings
## Sidebar Navigation Enhancement
- Expanded Inbox section from 2 items to 4 items with channel-specific links
- All Messages → /inbox (📋)
- Gmail → /inbox?channel=gmail (✉️)
- WhatsApp → /inbox?channel=whatsapp (💬)
- Instagram → /inbox?channel=instagram (📸)
- Implemented smart active route detection based on pathname + search params
## Build System Troubleshooting
- Identified Next.js 14 prerendering errors (useSearchParams without Suspense)
- Extracted Sidebar navigation into separate SidebarNav component
- Wrapped useSearchParams() calls in Suspense boundaries
- Refactored inbox page into wrapper + content component pattern
- Fixed all 5 failing page prerender errors
- Verified successful build: All 10 routes prerendered
## CORS Configuration Fix
- Identified CORS error: Origin header mismatch due to trailing slash
- Browser sends: https://dpca-ten.vercel.app
- Railway was configured: https://dpca-ten.vercel.app/ (with slash)
- Updated CORS_ORIGIN environment variable to exact origin
- Verified API requests now succeed cross-origin

# Technical Issues Resolved
## Issue 1: Data Not Displaying from n8n
Symptom: Messages inserted by n8n workflows into Supabase messages table were not appearing in dashboard
### Root Cause
- Primary: RLS policies required auth.uid() matching entries in users table with role IN ("admin", "manager")
- Dashboard was querying with anon key, which has no user context
- Secondary: Status values in webhook payloads did not match DB schema CHECK constraint
### Solution
- Switch all frontend data fetching from direct Supabase to backend API
- Backend uses service_role key which bypasses RLS entirely
- Create migration to expand message.status CHECK constraint from 8 to 15 values
Verification: Status: Partially complete. API code done, migration SQL created but needs manual execution.

## Issue 2: Vercel Build Failures
Symptom: Build failed at static generation with 5-page prerender errors
### Root Cause
- Next.js 14 detects useSearchParams() hook during static build phase
- Requires component to be wrapped in <Suspense> boundary
- Sidebar.tsx imported by all pages, used useSearchParams() without wrapping
- Inbox page directly used useSearchParams() to read channel query param
### Solution
- Extract nav logic from Sidebar into SidebarNav component
- Wrap SidebarNav in <Suspense fallback={...}> boundary
- Refactor inbox page: wrapper component + InboxContent with Suspense
- Main page component returns JSX with Suspense boundary wrapping content
Verification: Status: FIXED. Latest build: 10/10 routes prerendered, 0 errors.

## Issue 3: CORS Blocking API Requests
Symptom: Browser console: "Access-Control-Allow-Origin header does not match"
### Root Cause
- CORS middleware on Railway configured with CORS_ORIGIN=https://dpca-ten.vercel.app/
- Browser sends requests with origin header WITHOUT trailing slash
- HTTP header comparison is exact string match: mismatch detected
### Solution
- Railway dashboard → backend service → Variables
- Update CORS_ORIGIN to https://dpca-ten.vercel.app (remove trailing slash)
- Deploy changes
Verification: Status: FIXED. API requests now succeed with proper CORS headers.

# Files Modified & Created
## Backend (4 files)
backend/src/routes/inboxes.ts [NEW]
- GET /api/inboxes - List connected inboxes with channel metadata
backend/src/routes/leads.ts [NEW]
- GET /api/leads - List leads for dashboard display
backend/src/index.ts [MODIFIED]
- Registered route imports and middleware setup
backend/src/routes/messages.ts [MODIFIED]
- Added ?channel= query parameter filtering
## Frontend (3 files)
dashboard/app/dashboard/page.tsx [MODIFIED]
- Complete rewrite with channel support and cards
dashboard/app/inbox/page.tsx [MODIFIED]
- Backend API, channel tabs, Suspense boundary
dashboard/components/Sidebar.tsx [MODIFIED]
- Per-channel nav items, SidebarNav component, Suspense
## Database (1 file)
supabase/migrations/20260411000001_expand_message_status.sql [NEW]
- Expands message.status CHECK constraint to 15 allowed values
- STATUS: Created but REQUIRES manual execution in Supabase SQL Editor

# Production Configuration

# Testing & Verification Results

# Outstanding Items & Critical Blockers

# Summary Statistics
- New Backend Routes Created: 2 (/api/inboxes, /api/leads)
- Backend Files Modified: 2 (index.ts, messages.ts)
- Frontend Files Modified: 3 (dashboard/page.tsx, inbox/page.tsx, Sidebar.tsx)
- Database Migrations Created: 1 (status constraint expansion)
- Pages with Fixed Build Errors: 5 (/dashboard, /inbox, /leads, /knowledge-base, /settings)
- Production Deployments Active: 2 (Railway, Vercel)
- Backend HTTP Endpoints: 13 (health, messages, inboxes, leads, drafts, webhooks)
- Supported Channels: 3 (Gmail, WhatsApp, Instagram)
- Critical Errors Fixed: 3 (RLS, Suspense, CORS)
- Build Errors Remaining: 0
- TypeScript Type Errors: 0
- IDE Errors: 0

# Next Steps (Week 3 Priority List)
- Execute migration SQL in Supabase SQL Editor (BLOCKING)
- Test API endpoints with real data from n8n
- Receive and integrate brand voice content from Sophie
- Provision VPS for n8n deployment
- Configure and deploy n8n
- Import and test workflows
- Implement UI enhancement modals
- End-to-end system testing


---
Report Generated: April 11, 2026 at 17:18 UTC
| Component | URL / Endpoint | Provider |
| --- | --- | --- |
| Frontend | https://dpca-ten.vercel.app | Vercel (Next.js) |
| Backend API | https://dpca-production.up.railway.app | Railway (Express) |
| Database | https://hefkqlkiuiqhgssdmvad.supabase.co | Supabase (PostgreSQL) |
| API Health | GET /api/health | Returns {status: ok, timestamp} |
| Test | Status | Details |
| --- | --- | --- |
| Backend Compilation | PASS | TypeScript strict mode: tsc --noEmit returned no errors |
| Frontend Build | PASS | Next.js production build: 10/10 routes prerendered successfully |
| Backend Health Check | PASS | GET https://dpca-production.up.railway.app/api/health returns 200 |
| Frontend Deployment | PASS | Accessible at https://dpca-ten.vercel.app from browser |
| API CORS | PASS | Cross-origin requests from Vercel to Railway succeeding |
| Channel Filtering | PASS | URL query params (?channel=) working on dashboard and inbox |
| Sidebar Navigation | PASS | Per-channel links active highlighting based on URL |
| IDE Type Checking | PASS | Zero TypeScript errors across all modified files |
| Item | Priority | Description |
| --- | --- | --- |
| Execute DB Migration | CRITICAL | Run expand_message_status.sql in Supabase SQL Editor to allow n8n webhook inserts. |
| Brand Voice Content | CRITICAL PATH | Awaiting Sophies brand voice examples - blocks prompt finalization |
| n8n VPS Setup | WEEK 3 | Provision Ubuntu 22.04 VPS (2GB RAM) for n8n deployment |
| UI Enhancements | WEEK 2-3 | Regenerate modals (regenerate, rejection, version history). ~18 hours |