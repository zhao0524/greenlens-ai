# GreenLens AI

**Measure the full environmental cost of your enterprise AI.**

GreenLens AI gives leadership teams visibility into what their organization's AI deployment actually costs: in carbon, in data center cooling water, and in unused licences. It connects to the admin-level usage data your AI providers already expose, runs it through a multi-agent analysis pipeline, and turns the results into an executive dashboard with concrete, board-ready recommendations and an exportable ESG report.

**Live app:** https://greenlens-ai-pi.vercel.app

GreenLens measures what the *organization* deployed, not what individuals said. It only reads aggregate admin and usage reports; no prompts, messages, or per-user content are collected.

## Features

- **Integrations** — connect OpenAI (organization usage API), Microsoft 365 (Graph reports for Copilot) and Google Workspace (Gemini licence data) in a few minutes, with no code changes.
- **Carbon & water footprint** — estimates AI-related emissions and cooling-water use from token volume, model class, and per-model energy factors.
- **Model efficiency** — classifies workloads and flags tasks running on heavier models than they need.
- **Licence intelligence** — utilization, unused seats, and renewal risk across enterprise AI licences.
- **Usage analytics** — anomaly detection (z-score), trend regression with 30-day projections, and hourly usage patterns.
- **Strategic recommendations** — decisions with effort estimates, projected savings, and the regulatory and financial incentives they support (CSRD, tax incentives, grants).
- **Benchmarks & trends** — month-over-month scores so improvement is visible over time.
- **ESG export** — download a PDF sustainability report for stakeholders.

## How it works

1. A company signs up (GitHub, Google, or Microsoft sign-in via Supabase Auth) and completes onboarding.
2. It connects one or more providers through OAuth or an admin API key.
3. Triggering an analysis starts a resumable, step-by-step pipeline of agents:
   - **Usage Analyst** — normalizes provider usage and runs the statistical analysis.
   - **Carbon & Water Accountant** — converts usage into emissions and water figures.
   - **License Intelligence** — evaluates seat utilization and renewal exposure.
   - **Strategic Translator** — turns findings into executive recommendations (Backboard with a persistent thread, falling back to Gemini, then to a deterministic generator).
   - **Synthesis** — assembles the final report.
4. Results are stored in Supabase and rendered across the dashboard: overview, footprint, models, licences, decisions, incentives, benchmark, and ESG pages.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling & charts | Tailwind CSS 4, Recharts, Lucide icons |
| Auth & database | Supabase (Postgres, Auth, Row Level Security) |
| AI | Backboard (agent threads), Google Gemini |
| Data sources | OpenAI Usage API, Microsoft Graph, Google Workspace Admin SDK |
| Reporting | `@react-pdf/renderer` |
| Validation & tests | Zod, Node test runner via `tsx` |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A Supabase project
- API credentials for the providers you want to connect (see below)

### Setup

```bash
git clone https://github.com/zhao0524/greenlens-ai.git
cd greenlens-ai
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Database

In the Supabase SQL editor, run `DATABASE_FULL_SETUP.sql`. It creates all tables, seeds the model energy and incentives libraries, and applies RLS policies, and is safe to re-run. Incremental changes live in `supabase-migrations/`. `reset-all-tenant-data.sql` and `reset-test-users.sql` wipe data for a clean demo state.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access for the analysis pipeline (server only) |
| `BACKBOARD_API_KEY` | Backboard agent threads for the Strategic Translator |
| `GEMINI_API_KEY` | Gemini fallback for recommendations and the ESG report narrative |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub sign-in |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | Microsoft 365 / Graph integration |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Workspace integration |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for OAuth callbacks |
| `ENABLE_GOOGLE_USAGE_SPIKE` | Optional Google usage-spike analysis (`false` by default) |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`tests/*.test.ts`) |

## Project structure

```text
src/
  app/                 Landing page, auth, onboarding, dashboard pages, API routes
    api/integrations/  Microsoft/Google OAuth and OpenAI key connection
    api/pipeline/      Trigger and poll analysis jobs
    api/reports/       Report data and PDF export
  components/          Dashboard, onboarding, and landing UI
  lib/
    agents/            Orchestrator and the five pipeline agents
    analysis/          Statistical analysis, job state, polling
    calculations/      Carbon and water models
    integrations/      Provider clients and token handling
    reports/           Report loading and availability
    supabase/          Browser, server, and admin clients
  analysis/pipeline.py Reference Python implementation of the statistical analysis
tests/                 Unit tests
supabase-migrations/   Incremental SQL migrations
```

The statistical analysis runs in TypeScript (`src/lib/analysis/run-stat-analysis.ts`) for Vercel compatibility. `src/analysis/pipeline.py` and `requirements.txt` are the original Python reference implementation.

Figures are estimates derived from provider usage data and published energy factors. They're meant to guide decisions, not replace audited emissions reporting.
