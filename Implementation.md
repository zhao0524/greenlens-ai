# GreenLens AI — Complete Implementation Plan

---

## Phase 0 — Setup Everything Before Writing Code (Day 1, Hours 1–2)

This phase is done by one person while others plan the UI. Do not skip any step here or you will hit blockers mid-build.

### Step 0.1 — Create All Accounts

Create accounts on all of these right now, in this order:

1. **Supabase** — supabase.com → New project → name it `greenlens` → save your project URL and anon key immediately
2. **Backboard.io** — app.backboard.io → sign up → grab your API key from the dashboard
3. **Vercel** — vercel.com → connect your GitHub account
4. **GitHub** → you already have this, but create a new repo called `greenlens-ai` and make it private

### Step 0.2 — Initialize the Next.js Project

```bash
npx create-next-app@latest greenlens-ai \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd greenlens-ai
```

### Step 0.3 — Install All Dependencies

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# PDF generation
npm install @react-pdf/renderer

# Charts for dashboard
npm install recharts

# Date handling
npm install date-fns

# Environment variable validation
npm install zod

# HTTP client
npm install axios
```

### Step 0.4 — Environment Variables

Create `.env.local` in the root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Backboard
BACKBOARD_API_KEY=your_backboard_api_key

# GitHub OAuth App — for user login only (created in step 0.5)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Microsoft Graph (created in step 0.6)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Google (created in step 0.7)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 0.5 — Create GitHub OAuth App (Login Only)

This single OAuth app is only for GreenLens user authentication. GitHub is no longer a primary data source — see the note on GitHub below.

1. GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: copy from Supabase dashboard → Auth → Providers → GitHub
4. Copy Client ID and Secret → paste into Supabase GitHub provider settings
5. In Supabase dashboard → Authentication → Providers → Enable **GitHub**

### Step 0.6 — Register Microsoft Azure App

1. Go to portal.azure.com → Azure Active Directory → App Registrations → New Registration
2. Name: `GreenLens`
3. Redirect URI: `http://localhost:3000/api/integrations/microsoft/callback`
4. After creation → API Permissions → Add:
   - `Reports.Read.All` (for M365 admin usage data)
   - `Organization.Read.All`
5. Certificates & Secrets → New client secret → copy it immediately
6. Save Application (client) ID, Directory (tenant) ID, and secret to `.env.local`

### Step 0.7 — Register Google Cloud App

1. console.cloud.google.com → New Project → name it `GreenLens`
2. APIs & Services → Enable: **Admin SDK API**, **Google Workspace Admin API**
3. APIs & Services → Credentials → OAuth 2.0 Client ID → Web Application
4. Authorized redirect URIs: `http://localhost:3000/api/integrations/google/callback`
5. Save Client ID and Secret to `.env.local`

---

## A Note on GitHub — Why It Is Not a Primary Data Source

The original plan included GitHub repo scanning as a standalone agent. This has been removed as a primary signal for two reasons.

First, static code analysis of AI usage patterns is noisy. Real enterprise codebases have hundreds of files, abstraction layers, environment variable references, and wrapper functions that make model identification from pattern matching unreliable. You will get false positives and miss real usage.

Second, it is redundant. The provider usage APIs — OpenAI, Azure, Google — tell you exactly which models are being called, at what volume, with real token counts. That is a far stronger and more trustworthy signal than scanning for model name strings in source files.

GitHub OAuth remains in the stack for user login only. If a company optionally connects their repo during onboarding, the system runs a lightweight scan and surfaces any findings as supplementary context in the report — flagging things like hardcoded model strings or missing caching logic as engineering notes. It is never the primary driver of any recommendation or calculation.

---

## Phase 1 — Database Schema (Day 1, Hours 2–3)

Go to Supabase → SQL Editor and run these in order.

### Step 1.1 — Companies Table

```sql
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  industry TEXT,
  headcount_range TEXT,
  primary_use_cases TEXT[],
  esg_reporting_obligations TEXT[],
  supabase_user_id UUID REFERENCES auth.users(id),
  onboarding_complete BOOLEAN DEFAULT FALSE
);
```

### Step 1.2 — Integrations Table

Stores OAuth tokens and connection status for every provider.

```sql
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- provider values: 'microsoft', 'google', 'openai',
  --                  'anthropic', 'aws', 'azure_openai'
  -- 'github' only appears here if company opts in for supplementary scan
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  -- metadata stores: tenant_id, org_id, scopes, api_key_hash, etc.
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(company_id, provider)
);
```

### Step 1.3 — Analysis Jobs Table

Tracks every pipeline run.

```sql
CREATE TABLE analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  -- status values: pending, running, complete, failed
  current_agent TEXT,
  -- values: usage_analyst, carbon_water_accountant,
  --         license_intelligence, strategic_translator, synthesis
  error_message TEXT,
  backboard_thread_id TEXT
  -- the Backboard thread ID for this pipeline run
);
```

### Step 1.4 — Agent Outputs Table

Stores structured output from each agent as it completes.

```sql
CREATE TABLE agent_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  -- agent names: usage_analyst, carbon_water_accountant,
  --              license_intelligence, strategic_translator
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  output JSONB NOT NULL
);
```

### Step 1.5 — Reports Table

The final assembled briefing per company per month.

```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES analysis_jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reporting_period TEXT NOT NULL,
  -- format: '2025-06'

  -- Top line metrics
  carbon_kg DECIMAL,
  water_liters DECIMAL,
  model_efficiency_score INTEGER,
  license_utilization_rate DECIMAL,

  -- Full report content
  executive_summary JSONB,
  footprint_detail JSONB,
  model_efficiency_analysis JSONB,
  license_intelligence JSONB,
  strategic_decisions JSONB,
  benchmark_data JSONB,
  esg_disclosure JSONB,

  -- Previous period for delta calculation
  prev_carbon_kg DECIMAL,
  prev_water_liters DECIMAL,

  -- PDF storage path
  pdf_url TEXT
);
```

### Step 1.6 — Model Energy Library Table

The scientific backbone of the carbon and water calculations. Every model the system encounters gets looked up here.

```sql
CREATE TABLE model_energy_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_identifier TEXT UNIQUE NOT NULL,
  -- exact strings as returned by provider APIs
  -- e.g. 'gpt-4', 'gpt-4o', 'claude-3-opus-20240229', 'claude-3-haiku'
  provider TEXT NOT NULL,
  model_class TEXT NOT NULL,
  -- 'frontier', 'mid', 'small'
  -- frontier = highest capability, highest energy
  -- mid = balanced capability and efficiency
  -- small = task-specific, lowest energy
  energy_wh_per_1k_input_tokens DECIMAL NOT NULL,
  energy_wh_per_1k_output_tokens DECIMAL NOT NULL,
  relative_efficiency_score INTEGER NOT NULL,
  -- 1-100, higher = more energy efficient
  -- used to calculate the model efficiency score shown on dashboard
  appropriate_task_types TEXT[],
  -- what this model is actually suited for
  -- e.g. ['classification', 'extraction', 'simple_qa']
  -- vs frontier models: ['complex_reasoning', 'generation', 'analysis']
  source_citation TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 1.7 — Seed the Model Energy Library

These values are derived from published benchmarking research (ArXiv 2505.09598 — LLM Environmental Benchmarking, Nature Scientific Reports 2025). They represent per-token energy intensity based on observed hardware configurations at each provider.

```sql
INSERT INTO model_energy_library
(model_identifier, provider, model_class,
 energy_wh_per_1k_input_tokens, energy_wh_per_1k_output_tokens,
 relative_efficiency_score, appropriate_task_types, source_citation)
VALUES
-- OpenAI models
('gpt-4', 'openai', 'frontier',
 0.0088, 0.0352, 15,
 ARRAY['complex_reasoning', 'open_ended_generation', 'multi_step_analysis'],
 'Nature Scientific Reports 2025 / ArXiv 2505.09598'),

('gpt-4o', 'openai', 'frontier',
 0.0018, 0.0072, 45,
 ARRAY['complex_reasoning', 'multimodal', 'generation'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking'),

('gpt-4o-mini', 'openai', 'small',
 0.0003, 0.0012, 78,
 ARRAY['classification', 'extraction', 'simple_qa', 'summarization'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking'),

('gpt-3.5-turbo', 'openai', 'mid',
 0.0004, 0.0016, 72,
 ARRAY['drafting', 'simple_generation', 'qa'],
 'Published energy intensity estimates'),

-- Anthropic models
('claude-3-opus-20240229', 'anthropic', 'frontier',
 0.0095, 0.0380, 12,
 ARRAY['complex_reasoning', 'research', 'nuanced_analysis'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking'),

('claude-3-sonnet-20240229', 'anthropic', 'mid',
 0.0022, 0.0088, 52,
 ARRAY['drafting', 'analysis', 'generation', 'qa'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking'),

('claude-3-haiku-20240307', 'anthropic', 'small',
 0.0003, 0.0012, 82,
 ARRAY['classification', 'extraction', 'simple_qa', 'ticket_routing'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking'),

('claude-3-5-sonnet-20241022', 'anthropic', 'mid',
 0.0019, 0.0076, 58,
 ARRAY['drafting', 'analysis', 'code_generation', 'qa'],
 'ArXiv 2505.09598 - LLM Environmental Benchmarking');
```

### Step 1.8 — Regional Carbon Intensity Table

Carbon and water cost varies significantly by where the data center is located. The same model call routed to a coal-heavy US grid carries a fundamentally different environmental cost than one routed to a European renewable grid.

```sql
CREATE TABLE regional_carbon_intensity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_identifier TEXT UNIQUE NOT NULL,
  provider TEXT,
  carbon_intensity_gco2_per_kwh DECIMAL NOT NULL,
  -- grams of CO2 per kilowatt-hour of electricity generated
  -- source: EPA eGRID 2024 (US), IEA 2024 (international)
  water_usage_effectiveness DECIMAL DEFAULT 1.9,
  -- liters of water per kWh consumed by data center
  -- source: The Green Grid WUE benchmark, average = 1.9 L/kWh
  water_stress_multiplier DECIMAL DEFAULT 1.0,
  -- environmental significance multiplier for water withdrawals
  -- 1.0 = normal, 1.8+ = high-stress arid region (Phoenix, Vegas)
  -- 0.7 = low-stress abundant region (Canada, Northwest Europe)
  data_source TEXT
);

INSERT INTO regional_carbon_intensity VALUES
(gen_random_uuid(), 'us-east-1', 'aws', 320.5, 1.9, 1.2, 'EPA eGRID 2024'),
(gen_random_uuid(), 'us-west-2', 'aws', 118.3, 1.6, 1.8, 'EPA eGRID 2024'),
(gen_random_uuid(), 'eu-west-1', 'aws', 82.4, 1.4, 0.9, 'IEA Europe 2024'),
(gen_random_uuid(), 'eastus', 'azure', 298.7, 1.9, 1.2, 'EPA eGRID 2024'),
(gen_random_uuid(), 'westeurope', 'azure', 89.2, 1.3, 0.8, 'IEA Europe 2024'),
(gen_random_uuid(), 'us-central1', 'google', 245.6, 1.7, 1.5, 'EPA eGRID 2024'),
(gen_random_uuid(), 'europe-west1', 'google', 76.8, 1.2, 0.7, 'IEA Europe 2024'),
-- Fallback defaults when region is unknown
(gen_random_uuid(), 'default', null, 300.0, 1.9, 1.2, 'Global average estimate');
```

### Step 1.9 — Enable Row Level Security

```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company" ON companies
  FOR ALL USING (supabase_user_id = auth.uid());

CREATE POLICY "Users see own integrations" ON integrations
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Users see own jobs" ON analysis_jobs
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Users see own reports" ON reports
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE supabase_user_id = auth.uid()
    )
  );
```

---

## Phase 2 — Supabase Client Setup (Day 1, Hour 3)

### Step 2.1 — Server Client

`src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### Step 2.2 — Browser Client

`src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Step 2.3 — Middleware for Route Protection

`src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*']
}
```

### Step 2.4 — Auth Callback Route

`src/app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## Phase 3 — File Structure (Day 1, Hour 3)

Create this exact folder structure before writing any more code. Empty files are fine — the structure matters.

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              ← Executive Summary
│   │   │   ├── footprint/page.tsx    ← Carbon & Water Detail
│   │   │   ├── models/page.tsx       ← Model Efficiency Analysis
│   │   │   ├── licenses/page.tsx     ← License Intelligence
│   │   │   ├── decisions/
│   │   │   │   ├── page.tsx          ← All Decisions
│   │   │   │   └── [id]/page.tsx     ← Decision Detail
│   │   │   ├── benchmark/page.tsx    ← Sector Benchmarks
│   │   │   └── esg/page.tsx          ← ESG Export Page
│   │   └── layout.tsx
│   ├── onboarding/
│   │   ├── page.tsx                  ← Step 1: Company Info
│   │   ├── connect/page.tsx          ← Step 2: Connect Integrations
│   │   └── confirm/page.tsx          ← Step 3: Review & Launch
│   ├── auth/callback/route.ts
│   └── api/
│       ├── integrations/
│       │   ├── microsoft/
│       │   │   ├── connect/route.ts
│       │   │   └── callback/route.ts
│       │   ├── google/
│       │   │   ├── connect/route.ts
│       │   │   └── callback/route.ts
│       │   └── openai/
│       │       └── connect/route.ts  ← API key entry, no OAuth needed
│       ├── pipeline/
│       │   ├── trigger/route.ts
│       │   └── status/route.ts
│       └── reports/
│           ├── latest/route.ts
│           └── [id]/
│               ├── route.ts
│               └── pdf/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── backboard/
│   │   └── client.ts
│   ├── calculations/
│   │   ├── carbon.ts
│   │   └── water.ts
│   ├── agents/
│   │   ├── orchestrator.ts
│   │   ├── usage-analyst.ts
│   │   ├── carbon-water-accountant.ts
│   │   ├── license-intelligence.ts
│   │   ├── strategic-translator.ts
│   │   └── synthesis.ts
│   └── integrations/
│       ├── openai.ts
│       ├── microsoft.ts
│       └── google.ts
└── components/
    ├── dashboard/
    │   ├── MetricCard.tsx
    │   ├── DecisionCard.tsx
    │   ├── FootprintChart.tsx
    │   ├── BenchmarkChart.tsx
    │   └── ESGExport.tsx
    ├── onboarding/
    │   ├── CompanyForm.tsx
    │   └── IntegrationCard.tsx
    └── ui/
        └── StatusBadge.tsx
```

---

## Phase 4 — Integration Connectors (Day 1, Hours 4–7)

These functions pull raw data from provider APIs. They return only metadata — model identifiers, token counts, request volumes — never prompt content.

### Step 4.1 — OpenAI Usage Integration

`src/lib/integrations/openai.ts`:

```typescript
import axios from 'axios'

export async function getOpenAIUsage(apiKey: string, daysBack: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  // The OpenAI Usage API returns aggregate model metadata only.
  // Each record contains: date, model (snapshot_id), n_requests,
  // n_context_tokens_total, n_generated_tokens_total.
  // It does NOT contain prompt content, completion content, or user IDs.
  const response = await axios.get('https://api.openai.com/v1/usage', {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { date: formatDate(startDate) }
  })

  return normalizeOpenAIUsage(response.data.data)
}

function normalizeOpenAIUsage(rawUsage: any[]) {
  // Group by model, sum across all days in the period
  const byModel: Record<string, {
    model: string
    provider: string
    totalInputTokens: number
    totalOutputTokens: number
    totalRequests: number
  }> = {}

  for (const day of rawUsage) {
    for (const item of day.data || []) {
      const model = item.snapshot_id || 'unknown'
      if (!byModel[model]) {
        byModel[model] = {
          model,
          provider: 'openai',
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalRequests: 0
        }
      }
      byModel[model].totalInputTokens += item.n_context_tokens_total || 0
      byModel[model].totalOutputTokens += item.n_generated_tokens_total || 0
      byModel[model].totalRequests += item.n_requests || 0
    }
  }

  return Object.values(byModel)
}
```

### Step 4.2 — Microsoft Integration

`src/lib/integrations/microsoft.ts`:

```typescript
import axios from 'axios'

export async function getMicrosoftAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    })
  )
  return response.data.access_token
}

// Microsoft Graph Reports API — returns Copilot seat utilization.
// This is the same data visible in the Microsoft 365 Admin Center.
// It returns department-level and user-level activity flags,
// NOT message content or prompt content of any kind.
export async function getMicrosoftCopilotUsage(accessToken: string) {
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/reports/getMicrosoft365CopilotUsageUserDetail(period='D30')`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return response.data
}

export async function getMicrosoftLicenseDetails(accessToken: string) {
  const response = await axios.get(
    'https://graph.microsoft.com/v1.0/subscribedSkus',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const copilotLicenses = response.data.value.filter((sku: any) =>
    sku.skuPartNumber?.includes('COPILOT') ||
    sku.servicePlans?.some((plan: any) =>
      plan.servicePlanName?.includes('COPILOT')
    )
  )

  const totalSeats = copilotLicenses.reduce(
    (sum: number, sku: any) => sum + (sku.prepaidUnits?.enabled || 0), 0
  )
  const consumedSeats = copilotLicenses.reduce(
    (sum: number, sku: any) => sum + (sku.consumedUnits || 0), 0
  )

  return {
    totalSeats,
    consumedSeats,
    utilizationRate: totalSeats > 0
      ? Math.round((consumedSeats / totalSeats) * 100)
      : 0,
    licenses: copilotLicenses,
    estimatedAnnualCost: totalSeats * 30 * 12,
    // $30/user/month is the M365 Copilot list price
    potentialSavingsAtRenewal: (totalSeats - consumedSeats) * 30 * 12
  }
}
```

`src/app/api/integrations/microsoft/connect/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/microsoft/callback`,
    scope: 'https://graph.microsoft.com/Reports.Read.All offline_access',
    response_mode: 'query'
  })

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  )
}
```

`src/app/api/integrations/microsoft/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect('/onboarding/connect?error=microsoft_failed')

  const tokenResponse = await axios.post(
    `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/microsoft/callback`
    })
  )

  const { access_token, refresh_token, expires_in } = tokenResponse.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase
    .from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()

  await supabase.from('integrations').upsert({
    company_id: company!.id,
    provider: 'microsoft',
    access_token,
    refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    is_active: true
  })

  return NextResponse.redirect('/onboarding/connect?success=microsoft')
}
```

### Step 4.3 — OpenAI API Key Connection

Unlike Microsoft and Google, OpenAI access is via a direct API key rather than OAuth.

`src/app/api/integrations/openai/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { apiKey } = await request.json()

  if (!apiKey || !apiKey.startsWith('sk-')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
  }

  // Verify the key works before saving
  try {
    const testResponse = await fetch(
      'https://api.openai.com/v1/usage?date=' + new Date().toISOString().split('T')[0],
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!testResponse.ok) {
      return NextResponse.json({ error: 'API key validation failed' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach OpenAI' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase
    .from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()

  await supabase.from('integrations').upsert({
    company_id: company!.id,
    provider: 'openai',
    access_token: apiKey,
    metadata: { key_prefix: apiKey.slice(0, 8) + '...' },
    is_active: true
  })

  return NextResponse.json({ success: true })
}
```

---

## Phase 5 — Calculation Engine (Day 1, Hours 7–9)

This is the scientific core of GreenLens. These functions are deterministic — given the same inputs they always produce the same output, which is important for auditability.

### Step 5.1 — Carbon Calculator

`src/lib/calculations/carbon.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

interface UsageRecord {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  region?: string
}

export async function calculateCarbon(usageData: UsageRecord[]) {
  const supabase = await createClient()

  const { data: energyLibrary } = await supabase
    .from('model_energy_library').select('*')

  const { data: regionalData } = await supabase
    .from('regional_carbon_intensity').select('*')

  let totalCarbonGrams = 0
  let alternativeCarbonGrams = 0
  const byModel: Array<{ model: string, carbonKg: number, percentage: number }> = []

  for (const usage of usageData) {
    // Match model to energy library
    // Try exact match first, then partial match, then fallback to frontier class average
    const modelData =
      energyLibrary?.find(m => m.model_identifier === usage.model) ||
      energyLibrary?.find(m => usage.model.includes(m.model_identifier)) ||
      energyLibrary?.find(m => m.model_class === 'frontier' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'frontier')

    if (!modelData) continue

    // Match region to carbon intensity data
    const regionData =
      regionalData?.find(r => r.provider === usage.provider && usage.region?.includes(r.region_identifier)) ||
      regionalData?.find(r => r.provider === usage.provider) ||
      regionalData?.find(r => r.region_identifier === 'default') ||
      { carbon_intensity_gco2_per_kwh: 300, water_usage_effectiveness: 1.9, water_stress_multiplier: 1.2 }

    // Energy consumed in watt-hours
    const energyWh =
      (usage.totalInputTokens / 1000) * modelData.energy_wh_per_1k_input_tokens +
      (usage.totalOutputTokens / 1000) * modelData.energy_wh_per_1k_output_tokens

    // PUE (Power Usage Effectiveness) of 1.1 is the hyperscale average.
    // Accounts for cooling, networking, and overhead beyond raw compute.
    // Source: Google data center PUE reports 2024.
    const PUE = 1.1

    const carbonGrams =
      (energyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE

    totalCarbonGrams += carbonGrams

    // Counterfactual: what would the same token volume cost
    // using the most efficient small model from the same provider?
    const efficientAlternative =
      energyLibrary?.find(m => m.model_class === 'small' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'small')

    if (efficientAlternative) {
      const altEnergyWh =
        (usage.totalInputTokens / 1000) * efficientAlternative.energy_wh_per_1k_input_tokens +
        (usage.totalOutputTokens / 1000) * efficientAlternative.energy_wh_per_1k_output_tokens
      alternativeCarbonGrams +=
        (altEnergyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    }

    byModel.push({ model: usage.model, carbonKg: carbonGrams / 1000, percentage: 0 })
  }

  const totalCarbonKg = totalCarbonGrams / 1000

  byModel.forEach(m => {
    m.percentage = totalCarbonKg > 0
      ? Math.round((m.carbonKg / totalCarbonKg) * 100)
      : 0
  })

  // Weighted average efficiency score across all models in use,
  // weighted by token volume so high-volume models dominate the score
  const totalTokens = usageData.reduce(
    (sum, u) => sum + u.totalInputTokens + u.totalOutputTokens, 0
  )
  const weightedEfficiency = usageData.reduce((sum, u) => {
    const modelData = energyLibrary?.find(m => m.model_identifier === u.model)
    const score = modelData?.relative_efficiency_score || 20
    const weight = (u.totalInputTokens + u.totalOutputTokens) / Math.max(totalTokens, 1)
    return sum + (score * weight)
  }, 0)

  return {
    totalCarbonKg,
    byModel: byModel.sort((a, b) => b.carbonKg - a.carbonKg),
    alternativeCarbonKg: alternativeCarbonGrams / 1000,
    savingsKg: totalCarbonKg - (alternativeCarbonGrams / 1000),
    savingsPercentage: totalCarbonKg > 0
      ? Math.round(((totalCarbonKg - alternativeCarbonGrams / 1000) / totalCarbonKg) * 100)
      : 0,
    modelEfficiencyScore: Math.round(Math.min(100, Math.max(1, weightedEfficiency))),
    methodology: `Carbon = (tokens × energy_per_token × PUE) × regional_grid_intensity. ` +
      `PUE=1.1 (hyperscale average). Energy intensity per model from ArXiv 2505.09598. ` +
      `Grid intensity from EPA eGRID 2024 / IEA 2024.`
  }
}
```

### Step 5.2 — Water Calculator

`src/lib/calculations/water.ts`:

```typescript
// Average WUE (Water Usage Effectiveness) = 1.9 L/kWh
// Source: The Green Grid industry benchmark
// For every kWh a data center consumes, it withdraws 1.9L of water for cooling.
const AVERAGE_WUE = 1.9

// Water stress multipliers from WRI Aqueduct database.
// Same volume of water withdrawn in a water-scarce region carries
// a higher environmental burden than in a water-abundant region.
const REGIONAL_STRESS: Record<string, number> = {
  'us-east': 1.2,
  'us-west': 1.8,    // Arizona, Nevada, California — chronic water stress
  'us-central': 1.3,
  'europe': 0.85,
  'canada': 0.7,     // Abundant freshwater, low stress
  'asia-pacific': 1.4,
  'default': 1.2
}

export function calculateWater(
  carbonResult: { totalCarbonKg: number },
  region: string = 'default'
) {
  const stressMultiplier = REGIONAL_STRESS[region] || REGIONAL_STRESS['default']

  // Derive energy from carbon figure.
  // Using global average grid intensity of 300 gCO2/kWh and PUE of 1.1
  const estimatedEnergyKwh = (carbonResult.totalCarbonKg * 1000) / (300 * 1.1)

  const totalWaterLiters = estimatedEnergyKwh * AVERAGE_WUE * stressMultiplier
  const alternativeWaterLiters = totalWaterLiters * 0.35
  // 0.35 = roughly what remains after optimal model routing
  // (65% reduction aligns with carbon savings from frontier→small model switch)

  return {
    totalWaterLiters: Math.round(totalWaterLiters),
    totalWaterBottles: Math.round(totalWaterLiters / 0.519),
    // 519mL per bottle — based on UC Riverside research (100 words ≈ 519mL)
    alternativeWaterLiters: Math.round(alternativeWaterLiters),
    savingsLiters: Math.round(totalWaterLiters - alternativeWaterLiters),
    wueUsed: AVERAGE_WUE,
    stressMultiplier,
    methodology: `Water = estimated_energy_kWh × WUE (${AVERAGE_WUE} L/kWh) × ` +
      `regional_stress_multiplier (${stressMultiplier}). ` +
      `WUE source: The Green Grid industry benchmark. ` +
      `Water stress: WRI Aqueduct database.`
  }
}
```

---

## Phase 6 — The Four Agents (Day 2, Hours 1–6)

### Why Four Agents

The pipeline was reduced from seven agents to four. Each of the four owns a distinct, non-overlapping responsibility and together they produce everything the executive report requires. The eliminated agents were either redundant (Code Auditor — superseded by usage API data), too granular to be a standalone agent (Benchmark Agent — folded into synthesis), or better handled as part of an existing agent's output (Recommendation Ranker — now part of the Strategic Translator).

```
Provider APIs → [Agent 1: Usage Analyst] → model inventory + behavioral clusters
                       ↓
             [Agent 2: Carbon & Water Accountant] → footprint numbers + efficiency score
                       ↓
             [Agent 3: License Intelligence] → seat utilization + renewal data
                       ↓
             [Agent 4: Strategic Translator] → decisions + executive language + ESG text
                       ↓
             [Synthesis] → final report assembled in Supabase
```

Agents 1, 2, and 3 run sequentially because each feeds the next. Agent 4 takes all three outputs simultaneously via Backboard's shared memory. Synthesis writes the assembled report to the database.

### Step 6.1 — Backboard Client

`src/lib/backboard/client.ts`:

```typescript
const BASE_URL = 'https://app.backboard.io/api'

async function call(endpoint: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.BACKBOARD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`Backboard ${method} ${endpoint}: ${res.statusText}`)
  return res.json()
}

export const backboard = {
  createAssistant: (name: string, systemPrompt: string, model = 'claude-3-5-sonnet') =>
    call('/assistants', 'POST', {
      name,
      system_prompt: systemPrompt,
      llm_provider: 'anthropic',
      llm_model_name: model
    }),

  createThread: (assistantId: string) =>
    call('/threads', 'POST', { assistant_id: assistantId }),

  // memory: 'Auto' means Backboard extracts and stores key facts automatically.
  // This enables Agent 4 to recall everything Agents 1-3 found
  // without us manually passing state between functions.
  sendMessage: (threadId: string, content: string, memory: 'Auto' | 'Off' = 'Auto') =>
    call('/messages', 'POST', { thread_id: threadId, content, memory, stream: false })
}
```

### Step 6.2 — Orchestrator

`src/lib/agents/orchestrator.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { backboard } from '@/lib/backboard/client'
import { runUsageAnalyst } from './usage-analyst'
import { runCarbonWaterAccountant } from './carbon-water-accountant'
import { runLicenseIntelligence } from './license-intelligence'
import { runStrategicTranslator } from './strategic-translator'
import { runSynthesis } from './synthesis'

export async function runPipeline(jobId: string, companyId: string) {
  const supabase = await createClient()

  const setStatus = async (status: string, agent?: string) =>
    supabase.from('analysis_jobs').update({
      status,
      current_agent: agent || null,
      ...(status === 'running' && !agent ? { started_at: new Date().toISOString() } : {}),
      ...(['complete', 'failed'].includes(status) ? { completed_at: new Date().toISOString() } : {})
    }).eq('id', jobId)

  const saveOutput = async (agentName: string, output: any) =>
    supabase.from('agent_outputs').insert({ job_id: jobId, agent_name: agentName, output })

  try {
    await setStatus('running')

    // Create one Backboard assistant for the entire pipeline run.
    // All four agents communicate through a single shared thread.
    // Backboard's memory layer retains key findings from each agent,
    // making them available to Agent 4 without manual state passing.
    const assistant = await backboard.createAssistant(
      `GreenLens-${companyId}-${jobId}`,
      `You are the GreenLens analysis pipeline coordinator.
       You receive structured JSON findings from specialist agents.
       You store all findings in memory and make them available to subsequent agents.
       Always respond in valid JSON only. Never add markdown or explanation.`
    )
    const thread = await backboard.createThread(assistant.assistant_id)
    const threadId = thread.thread_id

    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'pipeline_start', company_id: companyId, job_id: jobId
    }))

    const { data: integrations } = await supabase
      .from('integrations').select('*')
      .eq('company_id', companyId).eq('is_active', true)

    // ── AGENT 1: Usage Analyst ────────────────────────────────────────
    await setStatus('running', 'usage_analyst')
    const usageResult = await runUsageAnalyst(integrations || [])
    await saveOutput('usage_analyst', usageResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'usage_analyst', findings: usageResult
    }))

    // ── AGENT 2: Carbon & Water Accountant ────────────────────────────
    await setStatus('running', 'carbon_water_accountant')
    const carbonWaterResult = await runCarbonWaterAccountant(usageResult)
    await saveOutput('carbon_water_accountant', carbonWaterResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'carbon_water_accountant', findings: carbonWaterResult
    }))

    // ── AGENT 3: License Intelligence ─────────────────────────────────
    await setStatus('running', 'license_intelligence')
    const licenseResult = await runLicenseIntelligence(integrations || [])
    await saveOutput('license_intelligence', licenseResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'license_intelligence', findings: licenseResult
    }))

    // ── AGENT 4: Strategic Translator ─────────────────────────────────
    // Runs inside Backboard — the LLM has full memory context from Agents 1-3
    await setStatus('running', 'strategic_translator')
    const translatorResult = await runStrategicTranslator(
      threadId, usageResult, carbonWaterResult, licenseResult
    )
    await saveOutput('strategic_translator', translatorResult)

    // ── SYNTHESIS ─────────────────────────────────────────────────────
    await setStatus('running', 'synthesis')
    const reportId = await runSynthesis(jobId, companyId, {
      usage: usageResult,
      carbonWater: carbonWaterResult,
      license: licenseResult,
      translator: translatorResult
    })

    await setStatus('complete')
    return reportId

  } catch (error: any) {
    await supabase.from('analysis_jobs').update({
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    }).eq('id', jobId)
    throw error
  }
}
```

### Step 6.3 — Agent 1: Usage Analyst

**What it does:** Pulls raw usage data from every connected provider, normalizes it into a consistent format, and classifies each model's usage into behavioral clusters. This is the foundation everything else builds on — if this agent produces bad data, everything downstream is wrong.

`src/lib/agents/usage-analyst.ts`:

```typescript
import { getOpenAIUsage } from '@/lib/integrations/openai'
import { getMicrosoftCopilotUsage } from '@/lib/integrations/microsoft'

export interface NormalizedUsage {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  region?: string
  // Behavioral cluster — derived from token and request profile
  // 'high_frequency_low_token': likely classification, routing, or simple QA
  //   → strong signal that a smaller model would do equally well
  // 'low_frequency_high_token': likely document analysis or complex generation
  //   → frontier model may be justified here
  // 'uniform': consistent usage, no clear pattern
  behaviorCluster: 'high_frequency_low_token' | 'low_frequency_high_token' | 'uniform'
}

export async function runUsageAnalyst(integrations: any[]): Promise<{
  normalizedUsage: NormalizedUsage[]
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  modelCount: number
  frontierModelPercentage: number
  dominantProvider: string
}> {
  const allUsage: NormalizedUsage[] = []

  for (const integration of integrations) {
    try {
      if (integration.provider === 'openai') {
        const usage = await getOpenAIUsage(integration.access_token)
        allUsage.push(...usage.map(u => ({
          ...u,
          behaviorCluster: classifyBehavior(u)
        })))
      }

      if (integration.provider === 'microsoft') {
        // Copilot usage is tracked at seat level via M365 Reports API,
        // not at the token level. Token-level data is not exposed.
        // This is a known limitation — recorded here as a flag for
        // the License Intelligence agent and disclosed in methodology notes.
        await getMicrosoftCopilotUsage(integration.access_token)
        // License Intelligence agent handles the seat utilization analysis
      }

      // Additional providers (Anthropic, AWS Bedrock, Azure OpenAI)
      // follow the same pattern — pull from usage APIs, normalize to
      // the NormalizedUsage interface, push to allUsage.

    } catch (error: any) {
      // Log but don't fail — one provider failing shouldn't kill the pipeline
      console.error(`Usage fetch failed for ${integration.provider}:`, error.message)
    }
  }

  const totalRequests = allUsage.reduce((s, u) => s + u.totalRequests, 0)
  const totalInputTokens = allUsage.reduce((s, u) => s + u.totalInputTokens, 0)
  const totalOutputTokens = allUsage.reduce((s, u) => s + u.totalOutputTokens, 0)

  const frontierModels = ['gpt-4', 'claude-3-opus', 'gemini-ultra']
  const frontierRequests = allUsage
    .filter(u => frontierModels.some(m => u.model.includes(m)))
    .reduce((s, u) => s + u.totalRequests, 0)
  const frontierModelPercentage = totalRequests > 0
    ? Math.round((frontierRequests / totalRequests) * 100)
    : 0

  const byProvider = allUsage.reduce((acc, u) => {
    acc[u.provider] = (acc[u.provider] || 0) + u.totalRequests
    return acc
  }, {} as Record<string, number>)
  const dominantProvider = Object.entries(byProvider)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'

  return {
    normalizedUsage: allUsage,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    modelCount: allUsage.length,
    frontierModelPercentage,
    dominantProvider
  }
}

function classifyBehavior(usage: {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
}): NormalizedUsage['behaviorCluster'] {
  if (usage.totalRequests === 0) return 'uniform'
  const avgInput = usage.totalInputTokens / usage.totalRequests
  const avgOutput = usage.totalOutputTokens / usage.totalRequests

  // High volume + low tokens per request = classification/routing pattern
  // This is the clearest signal of model-task mismatch
  if (usage.totalRequests > 1000 && avgInput < 500) {
    return 'high_frequency_low_token'
  }

  // Low volume + high tokens = analysis or generation
  // Frontier models may be justified here
  if (avgInput > 2000 || avgOutput > 1000) {
    return 'low_frequency_high_token'
  }

  return 'uniform'
}
```

### Step 6.4 — Agent 2: Carbon & Water Accountant

**What it does:** Takes the normalized usage from Agent 1 and runs the full environmental calculation — carbon by model, water consumption, and the counterfactual. Also identifies which specific usage clusters represent model-task mismatches. This agent produces the numbers that appear in the ESG disclosure.

`src/lib/agents/carbon-water-accountant.ts`:

```typescript
import { calculateCarbon } from '@/lib/calculations/carbon'
import { calculateWater } from '@/lib/calculations/water'
import type { NormalizedUsage } from './usage-analyst'

export async function runCarbonWaterAccountant(usageResult: {
  normalizedUsage: NormalizedUsage[]
  frontierModelPercentage: number
}) {
  const carbon = await calculateCarbon(usageResult.normalizedUsage)

  const primaryRegion = usageResult.normalizedUsage[0]?.region?.includes('eu')
    ? 'europe'
    : usageResult.normalizedUsage[0]?.region?.includes('west')
      ? 'us-west'
      : 'us-east'
  const water = calculateWater(carbon, primaryRegion)

  // Identify clusters where a frontier model is being used
  // for high-frequency, low-complexity tasks — the clearest mismatch signal
  const mismatchedClusters = usageResult.normalizedUsage.filter(u =>
    u.behaviorCluster === 'high_frequency_low_token' &&
    ['gpt-4', 'claude-3-opus'].some(m => u.model.includes(m))
  )
  const mismatchedRequests = mismatchedClusters.reduce((s, u) => s + u.totalRequests, 0)
  const totalRequests = usageResult.normalizedUsage.reduce((s, u) => s + u.totalRequests, 0)
  const modelTaskMismatchRate = totalRequests > 0
    ? Math.round((mismatchedRequests / totalRequests) * 100)
    : 0

  return {
    // Carbon figures
    totalCarbonKg: carbon.totalCarbonKg,
    carbonByModel: carbon.byModel,
    alternativeCarbonKg: carbon.alternativeCarbonKg,
    carbonSavingsKg: carbon.savingsKg,
    carbonSavingsPercentage: carbon.savingsPercentage,
    carbonMethodology: carbon.methodology,

    // Water figures
    totalWaterLiters: water.totalWaterLiters,
    totalWaterBottles: water.totalWaterBottles,
    alternativeWaterLiters: water.alternativeWaterLiters,
    waterSavingsLiters: water.savingsLiters,
    waterMethodology: water.methodology,

    // Efficiency metrics
    modelEfficiencyScore: carbon.modelEfficiencyScore,
    modelTaskMismatchRate,
    mismatchedModelClusters: mismatchedClusters.map(u => ({
      model: u.model,
      requests: u.totalRequests,
      behaviorCluster: u.behaviorCluster,
      suggestedAlternative: getSuggestedAlternative(u.model)
    }))
  }
}

function getSuggestedAlternative(model: string): string {
  if (model.includes('gpt-4')) return 'gpt-4o-mini'
  if (model.includes('claude-3-opus')) return 'claude-3-haiku'
  if (model.includes('gemini-ultra')) return 'gemini-flash'
  return 'a purpose-built smaller model'
}
```

### Step 6.5 — Agent 3: License Intelligence

**What it does:** Connects to Microsoft and Google admin portals to retrieve seat utilization data. Calculates dormant seats, utilization rate, and the financial impact of right-sizing at renewal. This is the primary value proposition for flat-license enterprises and should be treated as the most business-critical agent output for the corporate judge audience.

`src/lib/agents/license-intelligence.ts`:

```typescript
import {
  getMicrosoftLicenseDetails,
  getMicrosoftCopilotUsage
} from '@/lib/integrations/microsoft'

export async function runLicenseIntelligence(integrations: any[]) {
  const results: any = {
    providers: [],
    totalLicensedSeats: 0,
    totalActiveSeats: 0,
    totalDormantSeats: 0,
    overallUtilizationRate: 0,
    estimatedAnnualLicenseCost: 0,
    potentialAnnualSavings: 0,
    renewalAlerts: []
  }

  for (const integration of integrations) {
    try {
      if (integration.provider === 'microsoft') {
        const licenseData = await getMicrosoftLicenseDetails(integration.access_token)
        const copilotUsage = await getMicrosoftCopilotUsage(integration.access_token)

        // Count active seats from the usage report.
        // A seat is active if it shows any Copilot activity in the 30-day period.
        // The report returns one row per licensed user with activity flags.
        let activeSeats = 0
        if (copilotUsage?.value) {
          activeSeats = copilotUsage.value.filter(
            (user: any) => user.hasCopilotActivity || user.copilotLastActivityDate
          ).length
        }

        const dormantSeats = licenseData.totalSeats - activeSeats
        const utilizationRate = licenseData.totalSeats > 0
          ? Math.round((activeSeats / licenseData.totalSeats) * 100)
          : 0

        results.providers.push({
          provider: 'Microsoft Copilot',
          totalSeats: licenseData.totalSeats,
          activeSeats,
          dormantSeats,
          utilizationRate,
          estimatedAnnualCost: licenseData.estimatedAnnualCost,
          potentialSavingsAtRenewal: dormantSeats * 30 * 12,
          // $30/user/month Copilot M365 list price
          recommendation: dormantSeats > 20
            ? `Right-size from ${licenseData.totalSeats} to ${activeSeats + 10} seats at renewal. ` +
              `Estimated saving: $${((dormantSeats - 10) * 30 * 12).toLocaleString()}/year.`
            : `Utilization is healthy at ${utilizationRate}%. Monitor at next renewal.`
        })

        results.totalLicensedSeats += licenseData.totalSeats
        results.totalActiveSeats += activeSeats
        results.totalDormantSeats += dormantSeats
        results.estimatedAnnualLicenseCost += licenseData.estimatedAnnualCost
        results.potentialAnnualSavings += dormantSeats * 30 * 12

        // Surface renewal timing if stored in integration metadata
        const renewalDate = integration.metadata?.renewal_date
        if (renewalDate) {
          const monthsToRenewal = Math.round(
            (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
          )
          if (monthsToRenewal <= 6) {
            results.renewalAlerts.push({
              provider: 'Microsoft',
              monthsToRenewal,
              renewalDate,
              actionRequired: `Right-sizing decision needed ${monthsToRenewal} months before renewal`
            })
          }
        }
      }

      // Google Workspace Gemini follows the same pattern using Admin SDK Reports API

    } catch (error: any) {
      console.error(`License fetch failed for ${integration.provider}:`, error.message)
    }
  }

  results.overallUtilizationRate = results.totalLicensedSeats > 0
    ? Math.round((results.totalActiveSeats / results.totalLicensedSeats) * 100)
    : 0

  return results
}
```

### Step 6.6 — Agent 4: Strategic Translator

**What it does:** The only agent that calls the LLM directly. Takes all outputs from Agents 1–3 and produces three things: a prioritized decision list in plain executive language, a narrative for the report cover, and the ESG disclosure text. Uses Backboard's memory so it has full context of everything previous agents found without needing to receive all data as function arguments.

`src/lib/agents/strategic-translator.ts`:

```typescript
import { backboard } from '@/lib/backboard/client'

export async function runStrategicTranslator(
  threadId: string,
  usageResult: any,
  carbonWaterResult: any,
  licenseResult: any
) {
  const prompt = `
You are writing the executive intelligence section of a sustainability and governance report.
Your audience is a CTO, CFO, or Chief Sustainability Officer at a large enterprise.
They understand business but not AI internals. No technical jargon. No model names unless unavoidable.

Here are the pipeline findings:

USAGE:
- Total AI requests this period: ${usageResult.totalRequests?.toLocaleString()}
- Models in use: ${usageResult.modelCount}
- Frontier model usage: ${usageResult.frontierModelPercentage}% of all calls
- Primary provider: ${usageResult.dominantProvider}

ENVIRONMENTAL:
- Monthly carbon footprint: ${carbonWaterResult.totalCarbonKg?.toFixed(1)} kg CO2e
- Monthly water consumption: ${carbonWaterResult.totalWaterLiters?.toLocaleString()} liters
  (equivalent to ${carbonWaterResult.totalWaterBottles?.toLocaleString()} 500ml bottles)
- Model efficiency score: ${carbonWaterResult.modelEfficiencyScore}/100
- Model-task mismatch rate: ${carbonWaterResult.modelTaskMismatchRate}% of calls use
  high-capability models for tasks a smaller model handles equally well
- Optimal model scenario: carbon drops to ${carbonWaterResult.alternativeCarbonKg?.toFixed(1)} kg
  (saving ${carbonWaterResult.carbonSavingsKg?.toFixed(1)} kg, ${carbonWaterResult.carbonSavingsPercentage}% reduction)
- Mismatched deployments: ${JSON.stringify(carbonWaterResult.mismatchedModelClusters)}

LICENSE:
- Total licensed seats: ${licenseResult.totalLicensedSeats}
- Active seats: ${licenseResult.totalActiveSeats}
- Dormant seats: ${licenseResult.totalDormantSeats}
- Utilization rate: ${licenseResult.overallUtilizationRate}%
- Estimated annual license cost: $${licenseResult.estimatedAnnualLicenseCost?.toLocaleString()}
- Potential savings at renewal: $${licenseResult.potentialAnnualSavings?.toLocaleString()}
- Renewal alerts: ${JSON.stringify(licenseResult.renewalAlerts)}

Return ONLY a JSON object with this exact structure. No markdown. No explanation.

{
  "decisions": [
    {
      "title": "Short action-oriented title, max 8 words",
      "situation": "2-3 sentences. What is happening in plain English. No jargon.",
      "carbonSavedKg": number,
      "waterSavedLiters": number,
      "financialImpact": "Dollar figure as string, e.g. '$185,000/year at renewal'",
      "theDecision": "One sentence. What the executive needs to decide.",
      "teamEffort": "Effort estimate only. E.g. '2-3 weeks of engineering time'.",
      "riskOfInaction": "1-2 sentences on what happens if deferred.",
      "urgency": "Act Now" | "Act This Quarter" | "Act Before Renewal" | "Monitor",
      "impactScore": number between 1 and 10
    }
  ],
  "executiveNarrative": "3-4 sentence paragraph for the report cover. Direct and factual.",
  "esgDisclosureText": "2-3 paragraphs suitable for a CSRD or GRI report. Professional tone. Cites methodology."
}

Produce 2-4 decisions maximum. Sort by impactScore descending. Only include decisions with clear evidence of actionable waste or opportunity.
`

  const response = await backboard.sendMessage(threadId, prompt)

  try {
    const raw = response.content?.trim()
    const cleaned = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      decisions: [],
      executiveNarrative: 'Analysis complete. Please review the detailed findings below.',
      esgDisclosureText: 'AI environmental data is available in the detailed report sections.'
    }
  }
}
```

### Step 6.7 — Synthesis

**What it does:** Takes all four agent outputs and assembles the final report record in Supabase. No LLM call. Pure data assembly and storage.

`src/lib/agents/synthesis.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function runSynthesis(
  jobId: string,
  companyId: string,
  outputs: { usage: any, carbonWater: any, license: any, translator: any }
) {
  const supabase = await createClient()

  const { data: prevReport } = await supabase
    .from('reports').select('carbon_kg, water_liters')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1).single()

  const reportingPeriod = new Date().toISOString().slice(0, 7)

  const { data: report, error } = await supabase.from('reports').insert({
    company_id: companyId,
    job_id: jobId,
    reporting_period: reportingPeriod,

    carbon_kg: outputs.carbonWater.totalCarbonKg,
    water_liters: outputs.carbonWater.totalWaterLiters,
    model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
    license_utilization_rate: outputs.license.overallUtilizationRate,
    prev_carbon_kg: prevReport?.carbon_kg || null,
    prev_water_liters: prevReport?.water_liters || null,

    executive_summary: {
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      water_bottles: outputs.carbonWater.totalWaterBottles,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      license_utilization_rate: outputs.license.overallUtilizationRate,
      frontier_model_percentage: outputs.usage.frontierModelPercentage,
      narrative: outputs.translator.executiveNarrative,
      decisions_preview: outputs.translator.decisions?.slice(0, 3)
    },

    footprint_detail: {
      carbon_by_model: outputs.carbonWater.carbonByModel,
      total_carbon_kg: outputs.carbonWater.totalCarbonKg,
      alternative_carbon_kg: outputs.carbonWater.alternativeCarbonKg,
      carbon_savings_kg: outputs.carbonWater.carbonSavingsKg,
      total_water_liters: outputs.carbonWater.totalWaterLiters,
      water_bottles: outputs.carbonWater.totalWaterBottles,
      water_savings_liters: outputs.carbonWater.waterSavingsLiters,
      carbon_methodology: outputs.carbonWater.carbonMethodology,
      water_methodology: outputs.carbonWater.waterMethodology
    },

    model_efficiency_analysis: {
      model_inventory: outputs.usage.normalizedUsage,
      efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      mismatch_rate: outputs.carbonWater.modelTaskMismatchRate,
      mismatched_clusters: outputs.carbonWater.mismatchedModelClusters,
      frontier_percentage: outputs.usage.frontierModelPercentage
    },

    license_intelligence: outputs.license,

    strategic_decisions: {
      decisions: outputs.translator.decisions,
      executive_narrative: outputs.translator.executiveNarrative
    },

    benchmark_data: {
      sector: 'financial_services',
      note: 'Benchmark data populates as more companies join the platform.'
    },

    esg_disclosure: {
      reporting_period: reportingPeriod,
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      esg_text: outputs.translator.esgDisclosureText,
      carbon_methodology: outputs.carbonWater.carbonMethodology,
      water_methodology: outputs.carbonWater.waterMethodology,
      frameworks: ['CSRD', 'GRI 305', 'IFRS S2']
    }

  }).select().single()

  if (error) throw new Error(`Synthesis failed: ${error.message}`)
  return report!.id
}
```

---

## Phase 7 — API Routes (Day 2, Hours 6–8)

### Step 7.1 — Pipeline Trigger

`src/app/api/pipeline/trigger/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/agents/orchestrator'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies').select('id')
    .eq('supabase_user_id', user.id).single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: job } = await supabase
    .from('analysis_jobs')
    .insert({ company_id: company.id, status: 'pending' })
    .select().single()

  // Fire and forget — frontend polls /api/pipeline/status for progress updates
  runPipeline(job!.id, company.id).catch(console.error)

  return NextResponse.json({ jobId: job!.id })
}
```

### Step 7.2 — Status Polling

`src/app/api/pipeline/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const supabase = await createClient()
  const { data: job } = await supabase
    .from('analysis_jobs')
    .select('status, current_agent, error_message, completed_at')
    .eq('id', jobId).single()

  if (job?.status === 'complete') {
    const { data: report } = await supabase
      .from('reports').select('id').eq('job_id', jobId).single()
    return NextResponse.json({ ...job, reportId: report?.id })
  }

  return NextResponse.json(job)
}
```

---

## Phase 8 — Frontend (Day 2, Hours 8–12)

### Step 8.1 — Login Page

`src/app/(auth)/login/page.tsx`:

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">GreenLens AI</h1>
        <p className="text-gray-400 mb-8">
          Executive intelligence for your AI footprint
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-green-600 hover:bg-green-500 text-white
                     font-semibold py-3 px-4 rounded-xl transition-colors"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  )
}
```

### Step 8.2 — Executive Summary Dashboard

`src/app/(dashboard)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import MetricCard from '@/components/dashboard/MetricCard'
import DecisionCard from '@/components/dashboard/DecisionCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: company } = await supabase
    .from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()

  const { data: report } = await supabase
    .from('reports').select('*')
    .eq('company_id', company!.id)
    .order('created_at', { ascending: false })
    .limit(1).single()

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} />

  const carbonDelta = report.prev_carbon_kg
    ? Math.round(((report.carbon_kg - report.prev_carbon_kg) / report.prev_carbon_kg) * 100)
    : null

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Intelligence Brief</h1>
        <p className="text-gray-400 mt-1">
          {company!.name} · {report.reporting_period}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Monthly AI Carbon"
          value={`${Math.round(report.carbon_kg)} kg`}
          unit="CO₂e"
          delta={carbonDelta}
        />
        <MetricCard
          label="Monthly AI Water"
          value={`${Math.round(report.water_liters / 1000)}k L`}
          unit={`≈ ${Math.round(report.executive_summary?.water_bottles / 1000)}k bottles`}
        />
        <MetricCard
          label="Model Efficiency"
          value={`${report.model_efficiency_score}/100`}
          status={report.model_efficiency_score > 60 ? 'good' : 'warning'}
        />
        <MetricCard
          label="License Utilization"
          value={`${Math.round(report.license_utilization_rate)}%`}
          status={report.license_utilization_rate > 75 ? 'good' : 'warning'}
        />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8">
        <p className="text-gray-300 leading-relaxed">
          {report.executive_summary?.narrative}
        </p>
      </div>

      <h2 className="text-xl font-semibold text-white mb-4">
        Decisions This Quarter
      </h2>
      <div className="space-y-4">
        {report.strategic_decisions?.decisions
          ?.sort((a: any, b: any) => b.impactScore - a.impactScore)
          .slice(0, 3)
          .map((decision: any, i: number) => (
            <DecisionCard key={i} decision={decision} index={i + 1} />
          ))}
      </div>
    </div>
  )
}
```

### Step 8.3 — ESG Export Page

`src/app/(dashboard)/dashboard/esg/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function ESGPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: company } = await supabase
    .from('companies').select('*').eq('supabase_user_id', user!.id).single()

  const { data: report } = await supabase
    .from('reports').select('*').eq('company_id', company!.id)
    .order('created_at', { ascending: false }).limit(1).single()

  const esg = report?.esg_disclosure

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="border border-gray-700 rounded-2xl p-8 bg-gray-900">

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Environmental Disclosure</h1>
            <p className="text-gray-400">{company?.name}</p>
            <p className="text-gray-400">Reporting Period: {esg?.reporting_period}</p>
          </div>
          <span className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
            GreenLens Verified
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">AI Carbon Footprint</p>
            <p className="text-3xl font-bold text-white mt-1">
              {Math.round(esg?.carbon_kg)} kg
            </p>
            <p className="text-gray-500 text-sm">CO₂ equivalent</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">AI Water Consumption</p>
            <p className="text-3xl font-bold text-white mt-1">
              {Math.round(esg?.water_liters / 1000)}k L
            </p>
            <p className="text-gray-500 text-sm">Direct cooling consumption</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Model Efficiency Score</p>
            <p className="text-3xl font-bold text-white mt-1">
              {esg?.model_efficiency_score}/100
            </p>
            <p className="text-gray-500 text-sm">Industry benchmark</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Disclosure Statement</h2>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">
            {esg?.esg_text}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">
            Reporting Framework Alignment
          </h2>
          <div className="flex gap-3">
            {esg?.frameworks?.map((f: string) => (
              <span key={f} className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">METHODOLOGY</h3>
          <p className="text-gray-500 text-sm mb-2">{esg?.carbon_methodology}</p>
          <p className="text-gray-500 text-sm">{esg?.water_methodology}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-xl"
        >
          Download PDF
        </button>
      </div>
    </div>
  )
}
```

---

## Phase 9 — Onboarding Flow (Day 2, Hours 8–10)

### Step 9.1 — Company Info Form (Step 1)

`src/app/onboarding/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '',
    industry: '',
    headcount_range: '',
    esg_reporting: [] as string[]
  })

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('companies').insert({
      name: form.name,
      industry: form.industry,
      headcount_range: form.headcount_range,
      esg_reporting_obligations: form.esg_reporting,
      supabase_user_id: user!.id,
      onboarding_complete: false
    })
    router.push('/onboarding/connect')
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Tell us about your company</h1>
        <p className="text-gray-400 mb-8">Step 1 of 3 — takes about 2 minutes</p>

        <div className="space-y-4">
          <input
            placeholder="Company name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
          <select
            value={form.industry}
            onChange={e => setForm({...form, industry: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          >
            <option value="">Select industry</option>
            <option value="financial_services">Financial Services</option>
            <option value="consulting">Consulting</option>
            <option value="insurance">Insurance</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
          </select>
          <select
            value={form.headcount_range}
            onChange={e => setForm({...form, headcount_range: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          >
            <option value="">Company size</option>
            <option value="100-500">100–500 employees</option>
            <option value="500-2000">500–2,000 employees</option>
            <option value="2000-10000">2,000–10,000 employees</option>
            <option value="10000+">10,000+ employees</option>
          </select>

          <div>
            <p className="text-gray-400 text-sm mb-2">
              ESG reporting obligations (select all that apply)
            </p>
            {['CSRD', 'GRI', 'IFRS S2', 'None currently'].map(obligation => (
              <label key={obligation} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={form.esg_reporting.includes(obligation)}
                  onChange={e => {
                    const updated = e.target.checked
                      ? [...form.esg_reporting, obligation]
                      : form.esg_reporting.filter(o => o !== obligation)
                    setForm({...form, esg_reporting: updated})
                  }}
                  className="rounded"
                />
                <span className="text-white">{obligation}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.industry}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50
                       text-white font-semibold py-3 rounded-xl"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 9.2 — Connect Integrations (Step 2)

`src/app/onboarding/connect/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const integrations = [
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Copilot license utilization, seat data, and usage patterns via Microsoft Graph admin API.',
    badge: 'Recommended',
    connectUrl: '/api/integrations/microsoft/connect',
    type: 'oauth'
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Gemini for Workspace license utilization via Google Admin SDK. Read-only.',
    badge: null,
    connectUrl: '/api/integrations/google/connect',
    type: 'oauth'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'API model usage, token volumes, and request patterns. Usage API only — no prompt access.',
    badge: 'Recommended',
    connectUrl: '/api/integrations/openai/connect',
    type: 'apikey'
  }
]

export default function ConnectPage() {
  const router = useRouter()
  const [connected, setConnected] = useState<string[]>([])
  const [openaiKey, setOpenaiKey] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenAISave = async () => {
    setSaving(true)
    const res = await fetch('/api/integrations/openai/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: openaiKey })
    })
    if (res.ok) setConnected(prev => [...prev, 'openai'])
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Connect your AI stack</h1>
        <p className="text-gray-400 mb-2">Step 2 of 3</p>

        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-blue-300 text-sm">
            🔒 GreenLens connects to admin dashboards and usage APIs only.
            We never access prompt content, message content, or individual user data.
            All connections are read-only.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {integrations.map(integration => (
            <div key={integration.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{integration.name}</p>
                    {integration.badge && (
                      <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded-full">
                        {integration.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{integration.description}</p>
                </div>

                <div className="shrink-0">
                  {connected.includes(integration.id) ? (
                    <span className="text-green-400 text-sm font-medium">✓ Connected</span>
                  ) : integration.type === 'apikey' ? (
                    <div className="flex flex-col gap-2 items-end">
                      <input
                        type="password"
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={e => setOpenaiKey(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg
                                   px-3 py-1.5 text-white text-sm w-40"
                      />
                      <button
                        onClick={handleOpenAISave}
                        disabled={!openaiKey || saving}
                        className="text-green-400 text-sm disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save key'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => window.location.href = integration.connectUrl}
                      className="bg-gray-700 hover:bg-gray-600 text-white
                                 text-sm px-4 py-2 rounded-lg whitespace-nowrap"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/onboarding/confirm')}
          disabled={connected.length === 0}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50
                     text-white font-semibold py-3 rounded-xl"
        >
          Run Analysis →
        </button>

        <p className="text-gray-600 text-xs text-center mt-3">
          Connect at least one integration to generate your first report.
        </p>
      </div>
    </div>
  )
}
```

---

## Phase 10 — Deploy (Day 2, Final Hours)

### Step 10.1 — Push and Deploy

```bash
git add .
git commit -m "Initial GreenLens build"
git push origin main

npx vercel --prod
```

Go to Vercel dashboard → Project Settings → Environment Variables → add every variable from `.env.local`.

### Step 10.2 — Update All OAuth Redirect URLs

Once you have your production Vercel URL (e.g., `greenlens-ai.vercel.app`):

| Service | Where to update | What to change |
|---|---|---|
| Supabase | Auth → URL Configuration | Site URL + add redirect URL |
| GitHub OAuth App | Developer Settings → OAuth Apps | Homepage + Callback URL |
| Microsoft Azure | App Registration → Redirect URIs | Add production URI |
| Google Cloud | Credentials → OAuth Client | Add authorized redirect URI |

### Step 10.3 — Final Supabase Update

Supabase dashboard → Auth → URL Configuration:
- Site URL: `https://greenlens-ai.vercel.app`
- Redirect URLs: add `https://greenlens-ai.vercel.app/auth/callback`

---

## Build Order Summary

| Time | Phase | What You're Building |
|---|---|---|
| Hour 1–2 | Phase 0 | All accounts, repo, installs, env vars |
| Hour 2–3 | Phase 1 | Database schema in Supabase SQL Editor |
| Hour 3 | Phase 2 | Supabase client setup and middleware |
| Hour 3 | Phase 3 | All folders and empty files created |
| Hour 4–7 | Phase 4 | Integration connectors (OpenAI + Microsoft first) |
| Hour 7–9 | Phase 5 | Calculation engine (carbon + water math) |
| Day 2, Hour 1–6 | Phase 6 | Four agents + Backboard orchestration |
| Day 2, Hour 6–8 | Phase 7 | API routes (trigger + status) |
| Day 2, Hour 8–12 | Phase 8 | Dashboard frontend |
| Day 2, Hour 8–10 | Phase 9 | Onboarding flow |
| Day 2, Final | Phase 10 | Deploy to Vercel |

> **Demo strategy:** Get the pipeline working with mock/sample data first. A working demo with good sample data beats a broken demo with real data every time. Layer in real integrations once the core flow is solid.

---

## Agent Summary

| Agent | Primary Input | Primary Output | Why It Matters |
|---|---|---|---|
| Usage Analyst | Provider usage APIs (OpenAI, Azure, etc.) | Normalized model inventory + behavioral clusters | Foundation — everything else builds on this |
| Carbon & Water Accountant | Normalized usage data | Carbon kg, water liters, efficiency score, counterfactual | The environmental numbers — the product's core claim |
| License Intelligence | Microsoft/Google admin portals | Seat utilization, dormant count, renewal savings | Primary value prop for flat-license enterprises |
| Strategic Translator | All three above via Backboard memory | Decisions, executive narrative, ESG disclosure text | Turns numbers into something an exec can act on |
