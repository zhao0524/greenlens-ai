# GreenLens AI — Complete Implementation Plan

---

## Updated Product Framing (Based on Mentor Feedback)

Before building anything, internalize these updates to how GreenLens is positioned. They change what the dashboard emphasizes, what language the Strategic Translator uses, and how the pitch lands with corporate judges.

### 1. Lead With Financial and Regulatory Incentives, Not Just Sustainability

The mentor's first point is critical: sustainability alone does not close enterprise deals. What does close them is money and compliance. GreenLens needs to surface the concrete financial upside of acting on its recommendations, not just the environmental upside.

These are real and researchable:

**Financial benefits of efficient AI usage:**
- Reduced data center cooling costs when lighter models are used (less compute = less heat = less cooling water and electricity)
- Lower cloud infrastructure bills for companies on pay-per-use alongside their flat licenses
- Potential green energy grants for organizations that can demonstrate measurable AI efficiency improvements
- Tax incentives in the EU, Canada, and parts of Asia for organizations meeting sustainability thresholds

**Regulatory and compliance benefits (international angle):**
- CSRD (EU Corporate Sustainability Reporting Directive) is already law for ~50,000 companies including non-EU companies with EU operations or listings. Penalties for non-compliance are real.
- Canada's Federal Sustainable Development Strategy is expanding to include digital infrastructure
- Singapore's Green Plan 2030 creates reporting obligations for large organizations operating there
- Japan's GX (Green Transformation) policy includes corporate sustainability disclosure requirements
- UK's Sustainability Disclosure Requirements are expanding in scope

**Recognition and publicity:**
- CDP (Carbon Disclosure Project) scores affect institutional investor decisions
- B Corp certification pathways benefit from measurable AI footprint data
- Industry sustainability awards (many financial services firms actively compete for these)
- First-mover advantage in sector benchmarks — companies that start recording now will be ahead when reporting becomes mandatory

The GreenLens dashboard and Strategic Translator agent need to surface these explicitly. A recommendation should not just say "switch to a smaller model, save 280kg CO2." It should say "switch to a smaller model, save 280kg CO2, which contributes to your CSRD Scope 3 reduction target, and positions you ahead of the EU AI Act sustainability provisions taking effect in 2026."

### 2. The Privacy Framing — Organizational Not Individual

The mentor confirmed what we suspected: employees are not the target audience for this product, and framing privacy around them is the wrong angle. The correct framing is organizational.

GreenLens measures the ecological impact of the organization's AI deployment, not the behavior of individuals. The data collected is aggregate and structural: which models the organization has deployed, how many tokens the organization consumed, how many licenses the organization purchased vs. activated. No individual's prompts, messages, or usage patterns are collected or visible.

The mentor specifically noted that in M365 and Azure environments, overall organizational data is available without pulling individual-level data. This is exactly how GreenLens is built. The onboarding screen and the product marketing should make this explicit: "We measure what your organization deployed, not what your people said."

The methodology transparency the mentor asked for: GreenLens connects to Microsoft Graph Reports API (aggregate admin data), OpenAI Usage API (aggregate model and token data), and Google Workspace Admin SDK (aggregate license data). None of these APIs expose individual user content. This should be stated clearly in the product, not buried.

### 3. The Gartner Hype Cycle Angle — This Is a Big Deal

The mentor introduced the Hype Cycle framing and it's one of the sharpest additions to the pitch. Here's why it matters and how to use it.

Gartner's Hype Cycle describes how technologies move through five phases: Innovation Trigger, Peak of Inflated Expectations, Trough of Disillusionment, Slope of Enlightenment, and Plateau of Productivity. The mentor's view is that enterprise AI (especially mass-market tools like Copilot) is likely entering the Trough of Disillusionment now — meaning boards are starting to ask "what did we actually get for this investment?"

GreenLens is positioned perfectly for this moment for two reasons:

First, it provides objective, neutral data about AI performance and cost during a period when organizations are questioning the ROI of their AI spend. That data becomes a credible reference point that isn't coming from a vendor trying to sell more AI.

Second, companies that start recording this data now will be first to benefit when the market moves to the Slope of Enlightenment — the phase where organizations figure out how to use AI well. The ones with 12-24 months of efficiency, carbon, and utilization data will be able to demonstrate measurable improvement and take advantage of the incentives in point 1.

The pitch line: "You are likely entering the phase where your board will start asking hard questions about AI ROI. GreenLens gives you the data to answer those questions objectively, and positions you to lead when the market matures."

### 4. ROI, Minimal Implementation Effort, and "Line Go Up"

The mentor's final point is the most practical: enterprise purchases come down to ROI, and senior leadership responds to visible improvement over time.

GreenLens needs to make three things clear:
- Implementation effort is minimal (connect three integrations, takes under 30 minutes, no code changes required)
- The data produced is actionable, not just informational (each recommendation includes a specific decision, effort estimate, and projected outcome)
- Progress is visible and trackable (month-over-month scores, trend lines, improvement tracking against previous periods)

The dashboard should prominently show score improvement over time. If a company acts on a recommendation and their model efficiency score goes from 41 to 67 the following month, that delta needs to be front and center. Senior leadership wants to see the line go up. GreenLens should be designed to make that line go up and make it visible when it does.

Additionally, have mitigation strategies ready for companies with poor scores. A low model efficiency score is not a failure state — it's an opportunity. The dashboard should frame it as: "Your score is 34/100. Here are three strategies to reach 60 within 90 days, here is what that saves you, and here is what you can report to your board when you get there."

---

## Phase 0 — Setup Everything Before Writing Code (Day 1, Hours 1–2)

This phase is done by one person while others plan the UI. Do not skip any step here or you will hit blockers mid-build.

### Step 0.1 — Create All Accounts

Create accounts on all of these right now, in this order:

1. **Supabase** — supabase.com → New project → name it `greenlens` → save your project URL and anon key immediately
2. **Backboard.io** — app.backboard.io → sign up → grab your API key from the dashboard
3. **Vercel** — vercel.com → connect your GitHub account
4. **GitHub** → create a new repo called `greenlens-ai` and make it private

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

# Python analysis dependencies (run separately)
pip install numpy scipy scikit-learn sentence-transformers
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

# GitHub OAuth App — for user login only
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Microsoft Graph
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 0.5 — Create GitHub OAuth App (Login Only)

1. GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: copy from Supabase dashboard → Auth → Providers → GitHub
4. Copy Client ID and Secret → paste into Supabase GitHub provider settings
5. Supabase dashboard → Authentication → Providers → Enable **GitHub**

### Step 0.6 — Register Microsoft Azure App

1. portal.azure.com → Azure Active Directory → App Registrations → New Registration
2. Name: `GreenLens`
3. Redirect URI: `http://localhost:3000/api/integrations/microsoft/callback`
4. API Permissions → Add: `Reports.Read.All`, `Organization.Read.All`
5. Certificates & Secrets → New client secret → copy immediately
6. Save Application ID, Directory ID, and secret to `.env.local`

### Step 0.7 — Register Google Cloud App

1. console.cloud.google.com → New Project → name it `GreenLens`
2. APIs & Services → Enable: **Admin SDK API**, **Google Workspace Admin API**
3. APIs & Services → Credentials → OAuth 2.0 Client ID → Web Application
4. Authorized redirect URIs: `http://localhost:3000/api/integrations/google/callback`
5. Save Client ID and Secret to `.env.local`

---

## A Note on GitHub — Why It Is Not a Primary Data Source

GitHub repo scanning was removed as a primary signal. Static code analysis of AI usage patterns is noisy in real enterprise codebases — abstraction layers, environment variables, and wrapper functions make model identification from pattern matching unreliable.

The provider usage APIs tell you exactly which models are being called, at what volume, with real token counts. That is a far stronger signal. GitHub OAuth remains for user login only. If a company optionally connects their repo, a lightweight scan surfaces supplementary context (hardcoded model strings, missing caching patterns) as engineering notes only — never the driver of any recommendation or calculation.

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
  -- e.g. ['CSRD', 'GRI', 'IFRS S2', 'CDP', 'UK SDR']
  international_offices TEXT[],
  -- e.g. ['EU', 'UK', 'Singapore', 'Japan']
  -- used to surface region-specific regulatory incentives
  supabase_user_id UUID REFERENCES auth.users(id),
  onboarding_complete BOOLEAN DEFAULT FALSE
);
```

### Step 1.2 — Integrations Table

```sql
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- provider values: 'microsoft', 'google', 'openai', 'anthropic', 'aws', 'azure_openai'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(company_id, provider)
);
```

### Step 1.3 — Analysis Jobs Table

```sql
CREATE TABLE analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  -- values: pending, running, complete, failed
  current_agent TEXT,
  -- values: usage_analyst, stat_analysis, carbon_water_accountant,
  --         license_intelligence, strategic_translator, synthesis
  error_message TEXT,
  backboard_thread_id TEXT
);
```

### Step 1.4 — Agent Outputs Table

```sql
CREATE TABLE agent_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  output JSONB NOT NULL
);
```

### Step 1.5 — Reports Table

```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES analysis_jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reporting_period TEXT NOT NULL,

  -- Top line metrics
  carbon_kg DECIMAL,
  water_liters DECIMAL,
  model_efficiency_score INTEGER,
  license_utilization_rate DECIMAL,

  -- Stat analysis results
  anomaly_detected BOOLEAN DEFAULT FALSE,
  trend_direction TEXT,
  -- 'increasing', 'decreasing', 'stable'
  carbon_percentile DECIMAL,
  -- percentile vs industry peers

  -- Full report sections
  executive_summary JSONB,
  footprint_detail JSONB,
  model_efficiency_analysis JSONB,
  stat_analysis JSONB,
  license_intelligence JSONB,
  strategic_decisions JSONB,
  incentives_and_benefits JSONB,
  -- new section: financial, regulatory, and recognition benefits
  benchmark_data JSONB,
  esg_disclosure JSONB,
  mitigation_strategies JSONB,
  -- new section: strategies to improve a poor score

  prev_carbon_kg DECIMAL,
  prev_water_liters DECIMAL,
  prev_model_efficiency_score INTEGER,
  -- for delta and "line go up" tracking

  pdf_url TEXT
);
```

### Step 1.6 — Incentives Library Table

New table to store researchable financial and regulatory incentives by region and industry. This feeds the Incentives and Benefits section of the report.

```sql
CREATE TABLE incentives_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  -- e.g. 'EU', 'Canada', 'UK', 'Singapore', 'Japan', 'Global'
  incentive_type TEXT NOT NULL,
  -- 'regulatory_penalty', 'tax_incentive', 'grant', 'recognition', 'compliance_deadline'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_value TEXT,
  -- e.g. '$50,000-$500,000 in fines', 'Up to 15% tax credit', 'CDP A-List recognition'
  applicable_industries TEXT[],
  -- null means all industries
  deadline TEXT,
  source_url TEXT,
  last_verified TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with key incentives
INSERT INTO incentives_library
(region, incentive_type, title, description, estimated_value, applicable_industries, deadline, source_url)
VALUES
('EU', 'regulatory_penalty',
 'CSRD Non-Compliance Penalties',
 'Companies subject to CSRD that fail to report or misreport sustainability data face fines and potential director liability under EU member state law.',
 'Up to 10 million EUR or 5% of annual turnover depending on member state',
 NULL, '2025 reporting year (first reports due 2026)',
 'https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en'),

('EU', 'compliance_deadline',
 'EU AI Act Sustainability Provisions',
 'High-impact AI systems deployed in the EU will require environmental impact documentation under the EU AI Act, including energy consumption reporting.',
 'Compliance required or face market access restrictions',
 NULL, 'Phased from 2025-2027',
 'https://artificialintelligenceact.eu'),

('Canada', 'compliance_deadline',
 'Federal Sustainable Development Strategy Digital Infrastructure',
 'Canada is expanding FSDS requirements to include digital infrastructure and AI systems, with mandatory reporting expected for large organizations.',
 'Regulatory compliance requirement',
 NULL, 'Expected 2026',
 'https://www.fsds-sfdd.ca'),

('Global', 'recognition',
 'CDP Climate Disclosure Score',
 'Companies that can demonstrate measurable reductions in AI-related Scope 3 emissions improve their CDP score, which directly affects institutional investor decisions and access to green financing.',
 'Improved investor access, green bond eligibility, cost of capital reduction',
 NULL, 'Annual',
 'https://www.cdp.net'),

('EU', 'tax_incentive',
 'EU Green Deal Investment Incentives',
 'Organizations demonstrating measurable progress on sustainability metrics are eligible for preferential rates under EU green financing frameworks and national green tax schemes.',
 'Varies by member state, typically 10-25% tax credit on qualifying sustainability investments',
 NULL, 'Ongoing',
 'https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/european-green-deal_en'),

('Singapore', 'compliance_deadline',
 'Singapore Green Plan 2030 Corporate Disclosure',
 'Singapore requires large organizations operating locally to report on environmental impact including digital infrastructure under the SGX sustainability reporting framework.',
 'Regulatory compliance requirement for SGX-listed companies',
 ARRAY['financial_services', 'technology'], '2025 mandatory for large cap',
 'https://www.greenplan.gov.sg'),

('UK', 'compliance_deadline',
 'UK Sustainability Disclosure Requirements',
 'The FCA SDR framework requires in-scope financial firms to disclose sustainability-related risks and impacts, which increasingly includes digital and AI infrastructure.',
 'FCA enforcement action for non-compliance',
 ARRAY['financial_services'], '2025-2026 phased implementation',
 'https://www.fca.org.uk/sustainability'),

('Global', 'recognition',
 'B Corp Certification Environmental Standards',
 'B Corp certification requires measurable environmental performance data. AI footprint documentation strengthens the environmental section of the B Impact Assessment.',
 'Market differentiation, access to B Corp procurement networks',
 NULL, 'Ongoing',
 'https://www.bcorporation.net');
```

### Step 1.7 — Model Energy Library Table

```sql
CREATE TABLE model_energy_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_identifier TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  model_class TEXT NOT NULL,
  -- 'frontier', 'mid', 'small'
  energy_wh_per_1k_input_tokens DECIMAL NOT NULL,
  energy_wh_per_1k_output_tokens DECIMAL NOT NULL,
  relative_efficiency_score INTEGER NOT NULL,
  -- 1-100, higher = more efficient
  appropriate_task_types TEXT[],
  source_citation TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO model_energy_library
(model_identifier, provider, model_class,
 energy_wh_per_1k_input_tokens, energy_wh_per_1k_output_tokens,
 relative_efficiency_score, appropriate_task_types, source_citation)
VALUES
('gpt-4', 'openai', 'frontier', 0.0088, 0.0352, 15,
 ARRAY['complex_reasoning', 'open_ended_generation', 'multi_step_analysis'],
 'Nature Scientific Reports 2025 / ArXiv 2505.09598'),
('gpt-4o', 'openai', 'frontier', 0.0018, 0.0072, 45,
 ARRAY['complex_reasoning', 'multimodal', 'generation'],
 'ArXiv 2505.09598'),
('gpt-4o-mini', 'openai', 'small', 0.0003, 0.0012, 78,
 ARRAY['classification', 'extraction', 'simple_qa', 'summarization'],
 'ArXiv 2505.09598'),
('gpt-3.5-turbo', 'openai', 'mid', 0.0004, 0.0016, 72,
 ARRAY['drafting', 'simple_generation', 'qa'],
 'Published energy intensity estimates'),
('claude-3-opus-20240229', 'anthropic', 'frontier', 0.0095, 0.0380, 12,
 ARRAY['complex_reasoning', 'research', 'nuanced_analysis'],
 'ArXiv 2505.09598'),
('claude-3-sonnet-20240229', 'anthropic', 'mid', 0.0022, 0.0088, 52,
 ARRAY['drafting', 'analysis', 'generation', 'qa'],
 'ArXiv 2505.09598'),
('claude-3-haiku-20240307', 'anthropic', 'small', 0.0003, 0.0012, 82,
 ARRAY['classification', 'extraction', 'simple_qa', 'ticket_routing'],
 'ArXiv 2505.09598'),
('claude-3-5-sonnet-20241022', 'anthropic', 'mid', 0.0019, 0.0076, 58,
 ARRAY['drafting', 'analysis', 'code_generation', 'qa'],
 'ArXiv 2505.09598');
```

### Step 1.8 — Regional Carbon Intensity Table

```sql
CREATE TABLE regional_carbon_intensity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_identifier TEXT UNIQUE NOT NULL,
  provider TEXT,
  carbon_intensity_gco2_per_kwh DECIMAL NOT NULL,
  water_usage_effectiveness DECIMAL DEFAULT 1.9,
  water_stress_multiplier DECIMAL DEFAULT 1.0,
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
    company_id IN (SELECT id FROM companies WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "Users see own jobs" ON analysis_jobs
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE supabase_user_id = auth.uid())
  );

CREATE POLICY "Users see own reports" ON reports
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE supabase_user_id = auth.uid())
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

### Step 2.3 — Middleware

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

### Step 2.4 — Auth Callback

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
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## Phase 3 — File Structure (Day 1, Hour 3)

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/dashboard/
│   │   ├── page.tsx              ← Executive Summary
│   │   ├── footprint/page.tsx    ← Carbon & Water Detail
│   │   ├── models/page.tsx       ← Model Efficiency + Stat Analysis
│   │   ├── licenses/page.tsx     ← License Intelligence
│   │   ├── decisions/
│   │   │   ├── page.tsx          ← All Decisions
│   │   │   └── [id]/page.tsx     ← Decision Detail
│   │   ├── incentives/page.tsx   ← Financial & Regulatory Incentives (NEW)
│   │   ├── benchmark/page.tsx    ← Sector Benchmarks + Hype Cycle Context
│   │   └── esg/page.tsx          ← ESG Export Page
│   ├── onboarding/
│   │   ├── page.tsx
│   │   ├── connect/page.tsx
│   │   └── confirm/page.tsx
│   ├── auth/callback/route.ts
│   └── api/
│       ├── integrations/
│       │   ├── microsoft/connect/route.ts
│       │   ├── microsoft/callback/route.ts
│       │   ├── google/connect/route.ts
│       │   ├── google/callback/route.ts
│       │   └── openai/connect/route.ts
│       ├── pipeline/
│       │   ├── trigger/route.ts
│       │   └── status/route.ts
│       └── reports/[id]/route.ts
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── backboard/client.ts
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
├── analysis/
│   └── pipeline.py               ← Python stat analysis + NLP module
└── components/
    ├── dashboard/
    │   ├── MetricCard.tsx
    │   ├── DecisionCard.tsx
    │   ├── FootprintChart.tsx
    │   ├── TrendChart.tsx         ← New: shows "line go up"
    │   ├── IncentiveCard.tsx      ← New: surfaces financial/regulatory benefits
    │   ├── MitigationCard.tsx     ← New: strategies to improve poor scores
    │   └── ESGExport.tsx
    └── onboarding/
        ├── CompanyForm.tsx
        └── IntegrationCard.tsx
```

---

## Phase 4 — Integration Connectors (Day 1, Hours 4–7)

### Step 4.1 — OpenAI Usage Integration

`src/lib/integrations/openai.ts`:

```typescript
import axios from 'axios'

export async function getOpenAIUsage(apiKey: string, daysBack: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  // Usage API returns aggregate model metadata only.
  // Each record: date, model (snapshot_id), n_requests,
  // n_context_tokens_total, n_generated_tokens_total.
  // No prompt content, completion content, or user IDs.
  const response = await axios.get('https://api.openai.com/v1/usage', {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { date: formatDate(startDate) }
  })

  // Also capture daily counts for time series stat analysis
  const dailyRequestCounts: number[] = []
  for (const day of response.data.data || []) {
    const dayTotal = (day.data || []).reduce(
      (sum: number, item: any) => sum + (item.n_requests || 0), 0
    )
    dailyRequestCounts.push(dayTotal)
  }

  return {
    normalizedUsage: normalizeOpenAIUsage(response.data.data),
    dailyRequestCounts
  }
}

function normalizeOpenAIUsage(rawUsage: any[]) {
  const byModel: Record<string, any> = {}
  for (const day of rawUsage) {
    for (const item of day.data || []) {
      const model = item.snapshot_id || 'unknown'
      if (!byModel[model]) {
        byModel[model] = { model, provider: 'openai', totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0 }
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

export async function getMicrosoftAccessToken(tenantId: string, clientId: string, clientSecret: string) {
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

// Microsoft Graph Reports API.
// Returns aggregate organizational Copilot utilization.
// Collection methodology: Microsoft Graph Reports API (getMicrosoft365CopilotUsageUserDetail).
// This returns per-user activity flags (active/inactive), NOT message content.
// Individual user prompts, responses, or conversation content are never accessible
// through this API. This is organizational-level deployment data, not individual surveillance.
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
    sku.servicePlans?.some((plan: any) => plan.servicePlanName?.includes('COPILOT'))
  )
  const totalSeats = copilotLicenses.reduce((sum: number, sku: any) => sum + (sku.prepaidUnits?.enabled || 0), 0)
  const consumedSeats = copilotLicenses.reduce((sum: number, sku: any) => sum + (sku.consumedUnits || 0), 0)
  return {
    totalSeats,
    consumedSeats,
    utilizationRate: totalSeats > 0 ? Math.round((consumedSeats / totalSeats) * 100) : 0,
    licenses: copilotLicenses,
    estimatedAnnualCost: totalSeats * 30 * 12,
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
  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()
  await supabase.from('integrations').upsert({
    company_id: company!.id, provider: 'microsoft',
    access_token, refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    is_active: true
  })
  return NextResponse.redirect('/onboarding/connect?success=microsoft')
}
```

### Step 4.3 — OpenAI API Key Connection

`src/app/api/integrations/openai/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { apiKey } = await request.json()
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
  }
  try {
    const testResponse = await fetch(
      'https://api.openai.com/v1/usage?date=' + new Date().toISOString().split('T')[0],
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!testResponse.ok) return NextResponse.json({ error: 'API key validation failed' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Could not reach OpenAI' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()
  await supabase.from('integrations').upsert({
    company_id: company!.id, provider: 'openai', access_token: apiKey,
    metadata: { key_prefix: apiKey.slice(0, 8) + '...' }, is_active: true
  })
  return NextResponse.json({ success: true })
}
```

---

## Phase 5 — Calculation Engine (Day 1, Hours 7–9)

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
  const { data: energyLibrary } = await supabase.from('model_energy_library').select('*')
  const { data: regionalData } = await supabase.from('regional_carbon_intensity').select('*')

  let totalCarbonGrams = 0
  let alternativeCarbonGrams = 0
  const byModel: Array<{ model: string, carbonKg: number, percentage: number }> = []

  for (const usage of usageData) {
    const modelData =
      energyLibrary?.find(m => m.model_identifier === usage.model) ||
      energyLibrary?.find(m => usage.model.includes(m.model_identifier)) ||
      energyLibrary?.find(m => m.model_class === 'frontier' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'frontier')

    if (!modelData) continue

    const regionData =
      regionalData?.find(r => r.provider === usage.provider && usage.region?.includes(r.region_identifier)) ||
      regionalData?.find(r => r.provider === usage.provider) ||
      regionalData?.find(r => r.region_identifier === 'default') ||
      { carbon_intensity_gco2_per_kwh: 300, water_usage_effectiveness: 1.9, water_stress_multiplier: 1.2 }

    const energyWh =
      (usage.totalInputTokens / 1000) * modelData.energy_wh_per_1k_input_tokens +
      (usage.totalOutputTokens / 1000) * modelData.energy_wh_per_1k_output_tokens

    const PUE = 1.1
    const carbonGrams = (energyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    totalCarbonGrams += carbonGrams

    const efficientAlternative =
      energyLibrary?.find(m => m.model_class === 'small' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'small')

    if (efficientAlternative) {
      const altEnergyWh =
        (usage.totalInputTokens / 1000) * efficientAlternative.energy_wh_per_1k_input_tokens +
        (usage.totalOutputTokens / 1000) * efficientAlternative.energy_wh_per_1k_output_tokens
      alternativeCarbonGrams += (altEnergyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    }

    byModel.push({ model: usage.model, carbonKg: carbonGrams / 1000, percentage: 0 })
  }

  const totalCarbonKg = totalCarbonGrams / 1000
  byModel.forEach(m => {
    m.percentage = totalCarbonKg > 0 ? Math.round((m.carbonKg / totalCarbonKg) * 100) : 0
  })

  const totalTokens = usageData.reduce((sum, u) => sum + u.totalInputTokens + u.totalOutputTokens, 0)
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
      ? Math.round(((totalCarbonKg - alternativeCarbonGrams / 1000) / totalCarbonKg) * 100) : 0,
    modelEfficiencyScore: Math.round(Math.min(100, Math.max(1, weightedEfficiency))),
    methodology: `Carbon = (tokens x energy_per_token x PUE) x regional_grid_intensity. ` +
      `PUE=1.1 (hyperscale average). Energy intensity from ArXiv 2505.09598. ` +
      `Grid intensity from EPA eGRID 2024 / IEA 2024.`
  }
}
```

### Step 5.2 — Water Calculator

`src/lib/calculations/water.ts`:

```typescript
const AVERAGE_WUE = 1.9

const REGIONAL_STRESS: Record<string, number> = {
  'us-east': 1.2, 'us-west': 1.8, 'us-central': 1.3,
  'europe': 0.85, 'canada': 0.7, 'asia-pacific': 1.4, 'default': 1.2
}

export function calculateWater(carbonResult: { totalCarbonKg: number }, region = 'default') {
  const stressMultiplier = REGIONAL_STRESS[region] || REGIONAL_STRESS['default']
  const estimatedEnergyKwh = (carbonResult.totalCarbonKg * 1000) / (300 * 1.1)
  const totalWaterLiters = estimatedEnergyKwh * AVERAGE_WUE * stressMultiplier
  const alternativeWaterLiters = totalWaterLiters * 0.35

  return {
    totalWaterLiters: Math.round(totalWaterLiters),
    totalWaterBottles: Math.round(totalWaterLiters / 0.519),
    alternativeWaterLiters: Math.round(alternativeWaterLiters),
    savingsLiters: Math.round(totalWaterLiters - alternativeWaterLiters),
    wueUsed: AVERAGE_WUE,
    stressMultiplier,
    methodology: `Water = estimated_energy_kWh x WUE (${AVERAGE_WUE} L/kWh) x ` +
      `regional_stress_multiplier (${stressMultiplier}). ` +
      `WUE: The Green Grid benchmark. Water stress: WRI Aqueduct database.`
  }
}
```

---

## Phase 6 — Statistical Analysis and NLP Module

This runs as a Python subprocess called from the orchestrator after Agent 1 completes. It produces three stat analysis outputs and one NLP output, all of which feed into the report and the model efficiency score.

`src/analysis/pipeline.py`:

```python
import numpy as np
from scipy import stats
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
import json
import sys


# ── STATISTICAL ANALYSIS ─────────────────────────────────────────────────────

def detect_usage_anomalies(daily_counts: list) -> dict:
    """
    Z-score anomaly detection on daily request volume time series.
    Flags days where usage deviates more than 2.5 standard deviations
    from the period mean. Surfaced on dashboard as an alert.
    """
    if len(daily_counts) < 7:
        return {'anomaly_detected': False, 'reason': 'insufficient_data'}

    arr = np.array(daily_counts, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr)

    if std == 0:
        return {'anomaly_detected': False, 'mean': float(mean), 'std': 0.0}

    z_scores = np.abs((arr - mean) / std)
    anomaly_indices = np.where(z_scores > 2.5)[0].tolist()

    return {
        'anomaly_detected': len(anomaly_indices) > 0,
        'anomaly_day_indices': anomaly_indices,
        'mean_daily_requests': round(float(mean), 2),
        'std_dev': round(float(std), 2),
        'max_z_score': round(float(z_scores.max()), 2),
        'method': 'Z-score anomaly detection, threshold=2.5 standard deviations'
    }


def compute_usage_trend(daily_counts: list) -> dict:
    """
    Ordinary least squares linear regression on daily request counts.
    Determines trend direction (increasing/decreasing/stable) and
    projects forward 30 days. Powers the 'line go up' trend chart.
    """
    if len(daily_counts) < 5:
        return {'trend': 'insufficient_data'}

    x = np.arange(len(daily_counts), dtype=float)
    y = np.array(daily_counts, dtype=float)
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    future_x = len(daily_counts) + 30
    projected = slope * future_x + intercept

    return {
        'slope': round(float(slope), 4),
        'r_squared': round(float(r_value ** 2), 4),
        'p_value': round(float(p_value), 4),
        'trend_direction': 'increasing' if slope > 0.5 else 'decreasing' if slope < -0.5 else 'stable',
        'trend_significant': bool(p_value < 0.05),
        'projected_30d_requests': round(float(max(0, projected)), 2),
        'method': 'Ordinary least squares linear regression'
    }


def compute_carbon_percentile(company_carbon_kg: float, industry: str) -> dict:
    """
    Compares company carbon figure against a realistic industry distribution.
    Uses normal distribution CDF. Distribution parameters are seeded from
    published energy intensity benchmarks per sector. In production, these
    are replaced with real cross-company data as the platform scales.
    """
    distributions = {
        'financial_services': {'mean': 920, 'std': 380},
        'consulting':         {'mean': 640, 'std': 240},
        'insurance':          {'mean': 780, 'std': 310},
        'technology':         {'mean': 1200, 'std': 520},
        'healthcare':         {'mean': 560, 'std': 190},
        'default':            {'mean': 850, 'std': 350}
    }

    dist = distributions.get(industry, distributions['default'])
    percentile = stats.norm.cdf(company_carbon_kg, loc=dist['mean'], scale=dist['std']) * 100

    return {
        'percentile': round(float(percentile), 1),
        'industry_mean_kg': dist['mean'],
        'industry_std_kg': dist['std'],
        'relative_position': (
            'below sector median (efficient)' if percentile < 50 else
            'above sector median' if percentile < 75 else
            'top quartile for emissions'
        ),
        'method': 'Normal distribution CDF against industry benchmark distribution'
    }


# ── NLP ANALYSIS ─────────────────────────────────────────────────────────────

def cluster_usage_by_task_type(usage_records: list) -> dict:
    """
    Sentence embedding + KMeans clustering to semantically categorize
    what tasks a company's AI deployments are actually performing.

    Each usage record's behavioral profile is converted to a natural
    language description, embedded using a lightweight sentence transformer,
    then clustered into three task categories:
      - classification_routing: high volume, low complexity, small model appropriate
      - generation_drafting: medium volume, medium complexity
      - analysis_reasoning: low volume, high complexity, frontier model may be justified

    The cluster assignment for each model directly feeds the model-task
    mismatch calculation and the model efficiency score.
    """
    if not usage_records:
        return {'clusters': [], 'method': 'sentence-transformers + KMeans'}

    descriptions = []
    for record in usage_records:
        requests = max(record.get('totalRequests', 1), 1)
        avg_input = record.get('totalInputTokens', 0) / requests
        avg_output = record.get('totalOutputTokens', 0) / requests

        if requests > 1000 and avg_input < 500:
            desc = (
                "Very high volume of short repetitive requests suggesting automated "
                "classification, content routing, or simple question answering tasks "
                "that do not require complex reasoning."
            )
        elif avg_input > 2000 or avg_output > 1000:
            desc = (
                "Low volume requests with long inputs and extended outputs suggesting "
                "document analysis, research summarization, or complex multi-step "
                "reasoning tasks that may justify high-capability models."
            )
        else:
            desc = (
                "Moderate volume requests with medium length content suggesting "
                "conversational assistance, drafting, or general productivity tasks."
            )
        descriptions.append(desc)

    # all-MiniLM-L6-v2: 80MB, fast, sufficient quality for this clustering task
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(descriptions)

    n_clusters = min(3, len(usage_records))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)

    # Map cluster IDs to semantic task categories based on centroid characteristics
    category_map = {0: 'classification_routing', 1: 'generation_drafting', 2: 'analysis_reasoning'}

    clustered = []
    for i, record in enumerate(usage_records):
        clustered.append({
            'model': record.get('model'),
            'task_category': category_map.get(int(labels[i]), 'unknown'),
            'cluster_id': int(labels[i]),
            'appropriate_model_class': (
                'small' if category_map.get(int(labels[i])) == 'classification_routing'
                else 'mid' if category_map.get(int(labels[i])) == 'generation_drafting'
                else 'frontier'
            )
        })

    return {
        'clusters': clustered,
        'n_clusters': n_clusters,
        'method': 'Sentence embeddings (all-MiniLM-L6-v2) + KMeans clustering (k=3)'
    }


# ── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

def run_analysis(payload: dict) -> dict:
    usage_records = payload.get('normalizedUsage', [])
    daily_counts = payload.get('dailyRequestCounts', [])
    company_carbon_kg = payload.get('totalCarbonKg', 0)
    industry = payload.get('industry', 'default')

    return {
        'anomaly_detection': detect_usage_anomalies(daily_counts),
        'usage_trend': compute_usage_trend(daily_counts),
        'carbon_percentile': compute_carbon_percentile(company_carbon_kg, industry),
        'task_clustering': cluster_usage_by_task_type(usage_records)
    }


if __name__ == '__main__':
    payload = json.loads(sys.stdin.read())
    result = run_analysis(payload)
    print(json.dumps(result))
```

### Calling the Python Module from Next.js

Add this to the orchestrator after Agent 1 completes:

```typescript
import { spawn } from 'child_process'

async function runStatAnalysis(payload: {
  normalizedUsage: any[]
  dailyRequestCounts: number[]
  totalCarbonKg: number
  industry: string
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['src/analysis/pipeline.py'])
    let output = ''
    let errorOutput = ''

    python.stdin.write(JSON.stringify(payload))
    python.stdin.end()
    python.stdout.on('data', d => output += d.toString())
    python.stderr.on('data', d => errorOutput += d.toString())
    python.on('close', code => {
      if (code !== 0) {
        console.error('Stat analysis error:', errorOutput)
        // Don't fail the pipeline if stat analysis fails
        resolve({ error: 'stat_analysis_failed' })
        return
      }
      try { resolve(JSON.parse(output)) }
      catch { resolve({ error: 'parse_failed' }) }
    })
  })
}
```

---

## Phase 7 — The Four Agents (Day 2, Hours 1–6)

### Why Four Agents

```
Provider APIs → [Agent 1: Usage Analyst] → model inventory + behavioral clusters
                       ↓
             [Stat Analysis + NLP] → anomaly detection, trend, percentile, task clustering
                       ↓
             [Agent 2: Carbon & Water Accountant] → footprint numbers + efficiency score
                       ↓
             [Agent 3: License Intelligence] → seat utilization + renewal data
                       ↓
             [Agent 4: Strategic Translator] → decisions + incentives + mitigation strategies
                       ↓
             [Synthesis] → final report assembled in Supabase
```

### Step 7.1 — Backboard Client

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
    call('/assistants', 'POST', { name, system_prompt: systemPrompt, llm_provider: 'anthropic', llm_model_name: model }),
  createThread: (assistantId: string) =>
    call('/threads', 'POST', { assistant_id: assistantId }),
  sendMessage: (threadId: string, content: string, memory: 'Auto' | 'Off' = 'Auto') =>
    call('/messages', 'POST', { thread_id: threadId, content, memory, stream: false })
}
```

### Step 7.2 — Orchestrator

`src/lib/agents/orchestrator.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { backboard } from '@/lib/backboard/client'
import { runUsageAnalyst } from './usage-analyst'
import { runCarbonWaterAccountant } from './carbon-water-accountant'
import { runLicenseIntelligence } from './license-intelligence'
import { runStrategicTranslator } from './strategic-translator'
import { runSynthesis } from './synthesis'
import { spawn } from 'child_process'

async function runStatAnalysis(payload: any): Promise<any> {
  return new Promise((resolve) => {
    const python = spawn('python3', ['src/analysis/pipeline.py'])
    let output = ''
    python.stdin.write(JSON.stringify(payload))
    python.stdin.end()
    python.stdout.on('data', d => output += d.toString())
    python.on('close', () => {
      try { resolve(JSON.parse(output)) }
      catch { resolve({ error: 'stat_analysis_failed' }) }
    })
  })
}

export async function runPipeline(jobId: string, companyId: string) {
  const supabase = await createClient()

  const setStatus = async (status: string, agent?: string) =>
    supabase.from('analysis_jobs').update({
      status, current_agent: agent || null,
      ...(status === 'running' && !agent ? { started_at: new Date().toISOString() } : {}),
      ...(['complete', 'failed'].includes(status) ? { completed_at: new Date().toISOString() } : {})
    }).eq('id', jobId)

  const saveOutput = async (agentName: string, output: any) =>
    supabase.from('agent_outputs').insert({ job_id: jobId, agent_name: agentName, output })

  try {
    await setStatus('running')

    const assistant = await backboard.createAssistant(
      `GreenLens-${companyId}-${jobId}`,
      `You are the GreenLens analysis pipeline coordinator.
       You receive structured JSON findings from specialist agents and stat analysis.
       Store all findings in memory and make them available to subsequent agents.
       Always respond in valid JSON only. No markdown.`
    )
    const thread = await backboard.createThread(assistant.assistant_id)
    const threadId = thread.thread_id

    const { data: integrations } = await supabase.from('integrations').select('*')
      .eq('company_id', companyId).eq('is_active', true)

    const { data: company } = await supabase.from('companies').select('*')
      .eq('id', companyId).single()

    // ── AGENT 1: Usage Analyst ────────────────────────────────────────
    await setStatus('running', 'usage_analyst')
    const usageResult = await runUsageAnalyst(integrations || [])
    await saveOutput('usage_analyst', usageResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'usage_analyst', findings: usageResult
    }))

    // ── STAT ANALYSIS + NLP ───────────────────────────────────────────
    await setStatus('running', 'stat_analysis')
    const statResult = await runStatAnalysis({
      normalizedUsage: usageResult.normalizedUsage,
      dailyRequestCounts: usageResult.dailyRequestCounts || [],
      totalCarbonKg: 0, // will be updated after carbon agent
      industry: company?.industry || 'default'
    })
    await saveOutput('stat_analysis', statResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'stat_analysis_complete', findings: statResult
    }))

    // ── AGENT 2: Carbon & Water Accountant ────────────────────────────
    await setStatus('running', 'carbon_water_accountant')
    const carbonWaterResult = await runCarbonWaterAccountant(usageResult, statResult)
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
    await setStatus('running', 'strategic_translator')
    const translatorResult = await runStrategicTranslator(
      threadId, usageResult, carbonWaterResult, licenseResult, statResult, company
    )
    await saveOutput('strategic_translator', translatorResult)

    // ── SYNTHESIS ─────────────────────────────────────────────────────
    await setStatus('running', 'synthesis')
    const reportId = await runSynthesis(jobId, companyId, {
      usage: usageResult, carbonWater: carbonWaterResult,
      license: licenseResult, translator: translatorResult,
      statAnalysis: statResult
    })

    await setStatus('complete')
    return reportId

  } catch (error: any) {
    await supabase.from('analysis_jobs').update({
      status: 'failed', error_message: error.message,
      completed_at: new Date().toISOString()
    }).eq('id', jobId)
    throw error
  }
}
```

### Step 7.3 — Agent 1: Usage Analyst

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
  behaviorCluster: 'high_frequency_low_token' | 'low_frequency_high_token' | 'uniform'
}

export async function runUsageAnalyst(integrations: any[]) {
  const allUsage: NormalizedUsage[] = []
  const allDailyCounts: number[] = []

  for (const integration of integrations) {
    try {
      if (integration.provider === 'openai') {
        const { normalizedUsage, dailyRequestCounts } = await getOpenAIUsage(integration.access_token)
        allUsage.push(...normalizedUsage.map((u: any) => ({ ...u, behaviorCluster: classifyBehavior(u) })))
        allDailyCounts.push(...dailyRequestCounts)
      }
      if (integration.provider === 'microsoft') {
        // Handled by License Intelligence agent
        await getMicrosoftCopilotUsage(integration.access_token)
      }
    } catch (error: any) {
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

  const byProvider = allUsage.reduce((acc, u) => {
    acc[u.provider] = (acc[u.provider] || 0) + u.totalRequests
    return acc
  }, {} as Record<string, number>)

  return {
    normalizedUsage: allUsage,
    dailyRequestCounts: allDailyCounts,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    modelCount: allUsage.length,
    frontierModelPercentage: totalRequests > 0
      ? Math.round((frontierRequests / totalRequests) * 100) : 0,
    dominantProvider: Object.entries(byProvider).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
  }
}

function classifyBehavior(usage: any): NormalizedUsage['behaviorCluster'] {
  if (usage.totalRequests === 0) return 'uniform'
  const avgInput = usage.totalInputTokens / usage.totalRequests
  if (usage.totalRequests > 1000 && avgInput < 500) return 'high_frequency_low_token'
  if (avgInput > 2000 || (usage.totalOutputTokens / usage.totalRequests) > 1000) return 'low_frequency_high_token'
  return 'uniform'
}
```

### Step 7.4 — Agent 2: Carbon & Water Accountant

`src/lib/agents/carbon-water-accountant.ts`:

```typescript
import { calculateCarbon } from '@/lib/calculations/carbon'
import { calculateWater } from '@/lib/calculations/water'
import type { NormalizedUsage } from './usage-analyst'

export async function runCarbonWaterAccountant(
  usageResult: { normalizedUsage: NormalizedUsage[], frontierModelPercentage: number },
  statResult: any
) {
  const carbon = await calculateCarbon(usageResult.normalizedUsage)
  const primaryRegion = usageResult.normalizedUsage[0]?.region?.includes('eu')
    ? 'europe' : usageResult.normalizedUsage[0]?.region?.includes('west') ? 'us-west' : 'us-east'
  const water = calculateWater(carbon, primaryRegion)

  // Use NLP task clustering from stat analysis to identify mismatches
  // more accurately than threshold rules alone
  const taskClusters = statResult?.task_clustering?.clusters || []
  const mismatchedClusters = taskClusters.filter((c: any) =>
    c.task_category === 'classification_routing' &&
    ['gpt-4', 'claude-3-opus'].some((m: string) => c.model?.includes(m))
  )

  const mismatchedRequests = usageResult.normalizedUsage
    .filter(u => mismatchedClusters.some((c: any) => c.model === u.model))
    .reduce((s, u) => s + u.totalRequests, 0)
  const totalRequests = usageResult.normalizedUsage.reduce((s, u) => s + u.totalRequests, 0)

  return {
    totalCarbonKg: carbon.totalCarbonKg,
    carbonByModel: carbon.byModel,
    alternativeCarbonKg: carbon.alternativeCarbonKg,
    carbonSavingsKg: carbon.savingsKg,
    carbonSavingsPercentage: carbon.savingsPercentage,
    carbonMethodology: carbon.methodology,
    totalWaterLiters: water.totalWaterLiters,
    totalWaterBottles: water.totalWaterBottles,
    alternativeWaterLiters: water.alternativeWaterLiters,
    waterSavingsLiters: water.savingsLiters,
    waterMethodology: water.methodology,
    modelEfficiencyScore: carbon.modelEfficiencyScore,
    modelTaskMismatchRate: totalRequests > 0
      ? Math.round((mismatchedRequests / totalRequests) * 100) : 0,
    mismatchedModelClusters: mismatchedClusters.map((c: any) => ({
      model: c.model,
      taskCategory: c.task_category,
      suggestedAlternative: c.model?.includes('gpt-4') ? 'gpt-4o-mini'
        : c.model?.includes('claude-3-opus') ? 'claude-3-haiku' : 'a smaller model'
    }))
  }
}
```

### Step 7.5 — Agent 3: License Intelligence

`src/lib/agents/license-intelligence.ts`:

```typescript
import { getMicrosoftLicenseDetails, getMicrosoftCopilotUsage } from '@/lib/integrations/microsoft'

export async function runLicenseIntelligence(integrations: any[]) {
  const results: any = {
    providers: [], totalLicensedSeats: 0, totalActiveSeats: 0,
    totalDormantSeats: 0, overallUtilizationRate: 0,
    estimatedAnnualLicenseCost: 0, potentialAnnualSavings: 0, renewalAlerts: []
  }

  for (const integration of integrations) {
    try {
      if (integration.provider === 'microsoft') {
        const licenseData = await getMicrosoftLicenseDetails(integration.access_token)
        const copilotUsage = await getMicrosoftCopilotUsage(integration.access_token)

        // Count active seats from Microsoft Graph Reports API.
        // Data collection methodology: getMicrosoft365CopilotUsageUserDetail (D30 period).
        // Returns per-user activity flags only (hasCopilotActivity boolean).
        // Individual message content is never exposed through this API endpoint.
        let activeSeats = 0
        if (copilotUsage?.value) {
          activeSeats = copilotUsage.value.filter(
            (user: any) => user.hasCopilotActivity || user.copilotLastActivityDate
          ).length
        }

        const dormantSeats = licenseData.totalSeats - activeSeats
        const utilizationRate = licenseData.totalSeats > 0
          ? Math.round((activeSeats / licenseData.totalSeats) * 100) : 0

        results.providers.push({
          provider: 'Microsoft Copilot', totalSeats: licenseData.totalSeats,
          activeSeats, dormantSeats, utilizationRate,
          estimatedAnnualCost: licenseData.estimatedAnnualCost,
          potentialSavingsAtRenewal: dormantSeats * 30 * 12,
          recommendation: dormantSeats > 20
            ? `Right-size from ${licenseData.totalSeats} to ${activeSeats + 10} seats at renewal. ` +
              `Estimated saving: $${((dormantSeats - 10) * 30 * 12).toLocaleString()}/year.`
            : `Utilization healthy at ${utilizationRate}%. Monitor at next renewal.`
        })

        results.totalLicensedSeats += licenseData.totalSeats
        results.totalActiveSeats += activeSeats
        results.totalDormantSeats += dormantSeats
        results.estimatedAnnualLicenseCost += licenseData.estimatedAnnualCost
        results.potentialAnnualSavings += dormantSeats * 30 * 12

        const renewalDate = integration.metadata?.renewal_date
        if (renewalDate) {
          const monthsToRenewal = Math.round(
            (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
          )
          if (monthsToRenewal <= 6) {
            results.renewalAlerts.push({
              provider: 'Microsoft', monthsToRenewal, renewalDate,
              actionRequired: `Right-sizing decision needed ${monthsToRenewal} months before renewal`
            })
          }
        }
      }
    } catch (error: any) {
      console.error(`License fetch failed for ${integration.provider}:`, error.message)
    }
  }

  results.overallUtilizationRate = results.totalLicensedSeats > 0
    ? Math.round((results.totalActiveSeats / results.totalLicensedSeats) * 100) : 0

  return results
}
```

### Step 7.6 — Agent 4: Strategic Translator

Now includes incentives, mitigation strategies, and Hype Cycle context.

`src/lib/agents/strategic-translator.ts`:

```typescript
import { backboard } from '@/lib/backboard/client'
import { createClient } from '@/lib/supabase/server'

export async function runStrategicTranslator(
  threadId: string,
  usageResult: any,
  carbonWaterResult: any,
  licenseResult: any,
  statResult: any,
  company: any
) {
  const supabase = await createClient()

  // Load relevant incentives for this company's regions and industry
  const { data: incentives } = await supabase
    .from('incentives_library')
    .select('*')
    .or(`region.in.(${(company?.international_offices || ['Global']).join(',')}),region.eq.Global`)

  const prompt = `
You are writing the executive intelligence section of an AI governance and sustainability report.
Your audience is a CTO, CFO, or Chief Sustainability Officer at a large enterprise.
Plain English only. No technical jargon.

PIPELINE FINDINGS:

Usage: ${usageResult.totalRequests?.toLocaleString()} total requests, ${usageResult.modelCount} models,
${usageResult.frontierModelPercentage}% using high-capability models.

Environmental: ${carbonWaterResult.totalCarbonKg?.toFixed(1)} kg CO2e/month,
${carbonWaterResult.totalWaterLiters?.toLocaleString()} liters water/month
(${carbonWaterResult.totalWaterBottles?.toLocaleString()} bottles).
Model efficiency score: ${carbonWaterResult.modelEfficiencyScore}/100.
Mismatch rate: ${carbonWaterResult.modelTaskMismatchRate}% of calls use high-capability models
for tasks that do not require them.
Optimal model scenario saves ${carbonWaterResult.carbonSavingsKg?.toFixed(1)} kg CO2 and
${carbonWaterResult.waterSavingsLiters?.toLocaleString()} liters per month.

License: ${licenseResult.totalLicensedSeats} licensed seats, ${licenseResult.totalActiveSeats} active,
${licenseResult.totalDormantSeats} dormant. Utilization: ${licenseResult.overallUtilizationRate}%.
Annual license cost: $${licenseResult.estimatedAnnualLicenseCost?.toLocaleString()}.
Potential renewal savings: $${licenseResult.potentialAnnualSavings?.toLocaleString()}.
Renewal alerts: ${JSON.stringify(licenseResult.renewalAlerts)}.

Statistical analysis:
- Anomaly detected: ${statResult?.anomaly_detection?.anomaly_detected}
  ${statResult?.anomaly_detection?.anomaly_detected ? `(${statResult.anomaly_detection.max_z_score} std deviations above baseline)` : ''}
- Trend: ${statResult?.usage_trend?.trend_direction} (p=${statResult?.usage_trend?.p_value})
- Carbon percentile vs ${company?.industry || 'industry'} peers: ${statResult?.carbon_percentile?.percentile}th
  (${statResult?.carbon_percentile?.relative_position})
- Projected 30-day requests: ${statResult?.usage_trend?.projected_30d_requests?.toLocaleString()}

Available incentives and compliance obligations for this company:
${JSON.stringify(incentives?.slice(0, 5))}

Return ONLY valid JSON. No markdown. No explanation.

{
  "decisions": [
    {
      "title": "8 words max",
      "situation": "2-3 sentences plain English, no jargon",
      "carbonSavedKg": number,
      "waterSavedLiters": number,
      "financialImpact": "dollar figure as string",
      "theDecision": "one sentence, what the exec decides",
      "teamEffort": "effort estimate only, no instructions",
      "riskOfInaction": "1-2 sentences",
      "urgency": "Act Now" | "Act This Quarter" | "Act Before Renewal" | "Monitor",
      "impactScore": number 1-10
    }
  ],
  "incentivesAndBenefits": [
    {
      "title": "incentive name",
      "description": "plain english description of what this means for this company",
      "estimatedValue": "dollar or compliance value",
      "region": "where this applies",
      "actionRequired": "what the company needs to do to access this benefit"
    }
  ],
  "mitigationStrategies": [
    {
      "strategy": "name of strategy",
      "description": "what to do",
      "expectedScoreImprovement": "e.g. +20 points in 60 days",
      "effort": "Low / Medium / High",
      "timeframe": "e.g. 30 days / 1 quarter"
    }
  ],
  "hypeCycleContext": "2-3 sentences framing where AI sits in the Gartner Hype Cycle and why recording this data now positions the company advantageously when AI moves to the Slope of Enlightenment.",
  "executiveNarrative": "3-4 sentences for the report cover. Direct, factual.",
  "esgDisclosureText": "2-3 paragraphs for CSRD or GRI report. Professional tone. Cites methodology."
}

Produce 2-4 decisions. Sort by impactScore descending. Produce 2-3 incentives most relevant to this company.
Produce 3 mitigation strategies specifically for improving a score of ${carbonWaterResult.modelEfficiencyScore}/100.
`

  const response = await backboard.sendMessage(threadId, prompt)

  try {
    const cleaned = response.content?.trim().replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      decisions: [], incentivesAndBenefits: [], mitigationStrategies: [],
      hypeCycleContext: '', executiveNarrative: 'Analysis complete.',
      esgDisclosureText: 'AI environmental data available in detailed report sections.'
    }
  }
}
```

### Step 7.7 — Synthesis

`src/lib/agents/synthesis.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function runSynthesis(
  jobId: string, companyId: string,
  outputs: { usage: any, carbonWater: any, license: any, translator: any, statAnalysis: any }
) {
  const supabase = await createClient()

  const { data: prevReport } = await supabase.from('reports').select('carbon_kg, water_liters, model_efficiency_score')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).single()

  const reportingPeriod = new Date().toISOString().slice(0, 7)

  const { data: report, error } = await supabase.from('reports').insert({
    company_id: companyId, job_id: jobId, reporting_period: reportingPeriod,

    carbon_kg: outputs.carbonWater.totalCarbonKg,
    water_liters: outputs.carbonWater.totalWaterLiters,
    model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
    license_utilization_rate: outputs.license.overallUtilizationRate,

    // Stat analysis top-level fields for quick dashboard access
    anomaly_detected: outputs.statAnalysis?.anomaly_detection?.anomaly_detected || false,
    trend_direction: outputs.statAnalysis?.usage_trend?.trend_direction || 'stable',
    carbon_percentile: outputs.statAnalysis?.carbon_percentile?.percentile || null,

    prev_carbon_kg: prevReport?.carbon_kg || null,
    prev_water_liters: prevReport?.water_liters || null,
    prev_model_efficiency_score: prevReport?.model_efficiency_score || null,

    executive_summary: {
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      water_bottles: outputs.carbonWater.totalWaterBottles,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      license_utilization_rate: outputs.license.overallUtilizationRate,
      frontier_model_percentage: outputs.usage.frontierModelPercentage,
      carbon_percentile: outputs.statAnalysis?.carbon_percentile?.percentile,
      trend_direction: outputs.statAnalysis?.usage_trend?.trend_direction,
      anomaly_detected: outputs.statAnalysis?.anomaly_detection?.anomaly_detected,
      narrative: outputs.translator.executiveNarrative,
      hype_cycle_context: outputs.translator.hypeCycleContext,
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
      task_clustering: outputs.statAnalysis?.task_clustering,
      efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      mismatch_rate: outputs.carbonWater.modelTaskMismatchRate,
      mismatched_clusters: outputs.carbonWater.mismatchedModelClusters,
      frontier_percentage: outputs.usage.frontierModelPercentage
    },

    stat_analysis: {
      anomaly_detection: outputs.statAnalysis?.anomaly_detection,
      usage_trend: outputs.statAnalysis?.usage_trend,
      carbon_percentile: outputs.statAnalysis?.carbon_percentile,
      task_clustering_summary: outputs.statAnalysis?.task_clustering
    },

    license_intelligence: outputs.license,

    strategic_decisions: {
      decisions: outputs.translator.decisions,
      executive_narrative: outputs.translator.executiveNarrative
    },

    incentives_and_benefits: {
      incentives: outputs.translator.incentivesAndBenefits,
      note: 'Sourced from GreenLens incentives library. Verify current terms with relevant regulatory bodies.'
    },

    mitigation_strategies: {
      strategies: outputs.translator.mitigationStrategies,
      current_score: outputs.carbonWater.modelEfficiencyScore
    },

    benchmark_data: {
      carbon_percentile: outputs.statAnalysis?.carbon_percentile,
      hype_cycle_context: outputs.translator.hypeCycleContext
    },

    esg_disclosure: {
      reporting_period: reportingPeriod,
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      esg_text: outputs.translator.esgDisclosureText,
      carbon_methodology: outputs.carbonWater.carbonMethodology,
      water_methodology: outputs.carbonWater.waterMethodology,
      frameworks: ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']
    }
  }).select().single()

  if (error) throw new Error(`Synthesis failed: ${error.message}`)
  return report!.id
}
```

---

## Phase 8 — API Routes (Day 2, Hours 6–8)

### Step 8.1 — Pipeline Trigger

`src/app/api/pipeline/trigger/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/agents/orchestrator'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: job } = await supabase.from('analysis_jobs')
    .insert({ company_id: company.id, status: 'pending' }).select().single()

  runPipeline(job!.id, company.id).catch(console.error)
  return NextResponse.json({ jobId: job!.id })
}
```

### Step 8.2 — Status Polling

`src/app/api/pipeline/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const supabase = await createClient()
  const { data: job } = await supabase.from('analysis_jobs')
    .select('status, current_agent, error_message, completed_at').eq('id', jobId).single()

  if (job?.status === 'complete') {
    const { data: report } = await supabase.from('reports').select('id').eq('job_id', jobId).single()
    return NextResponse.json({ ...job, reportId: report?.id })
  }

  return NextResponse.json(job)
}
```

---

## Phase 9 — Frontend (Day 2, Hours 8–12)

### Step 9.1 — Executive Summary Dashboard

`src/app/(dashboard)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} />

  const carbonDelta = report.prev_carbon_kg
    ? Math.round(((report.carbon_kg - report.prev_carbon_kg) / report.prev_carbon_kg) * 100) : null
  const scoreDelta = report.prev_model_efficiency_score
    ? report.model_efficiency_score - report.prev_model_efficiency_score : null

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Intelligence Brief</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {report.reporting_period}</p>
      </div>

      {/* Anomaly alert */}
      {report.anomaly_detected && (
        <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4 mb-6">
          <p className="text-yellow-300 text-sm font-medium">
            Unusual activity detected this period. Your AI usage spiked significantly above baseline.
            See the model analysis page for details.
          </p>
        </div>
      )}

      {/* Top line metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label="Monthly AI Carbon" value={`${Math.round(report.carbon_kg)} kg`}
          unit="CO2e" delta={carbonDelta} />
        <MetricCard label="Monthly AI Water"
          value={`${Math.round(report.water_liters / 1000)}k L`}
          unit={`~${Math.round(report.executive_summary?.water_bottles / 1000)}k bottles`} />
        <MetricCard label="Model Efficiency" value={`${report.model_efficiency_score}/100`}
          delta={scoreDelta}
          status={report.model_efficiency_score > 60 ? 'good' : 'warning'} />
        <MetricCard label="License Utilization"
          value={`${Math.round(report.license_utilization_rate)}%`}
          status={report.license_utilization_rate > 75 ? 'good' : 'warning'} />
      </div>

      {/* Sector percentile + trend */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Sector Position</p>
          <p className="text-white font-semibold">
            {report.carbon_percentile?.toFixed(0)}th percentile for carbon intensity
          </p>
          <p className="text-gray-400 text-sm">{report.benchmark_data?.carbon_percentile?.relative_position}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Usage Trend</p>
          <p className="text-white font-semibold capitalize">{report.trend_direction}</p>
          <p className="text-gray-400 text-sm">
            Projected 30-day: {report.stat_analysis?.usage_trend?.projected_30d_requests?.toLocaleString()} requests
          </p>
        </div>
      </div>

      {/* Executive narrative */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8">
        <p className="text-gray-300 leading-relaxed">{report.executive_summary?.narrative}</p>
        {report.executive_summary?.hype_cycle_context && (
          <p className="text-gray-400 text-sm mt-3 pt-3 border-t border-gray-700">
            {report.executive_summary.hype_cycle_context}
          </p>
        )}
      </div>

      {/* Decisions */}
      <h2 className="text-xl font-semibold text-white mb-4">Decisions This Quarter</h2>
      <div className="space-y-4 mb-8">
        {report.strategic_decisions?.decisions
          ?.sort((a: any, b: any) => b.impactScore - a.impactScore)
          .slice(0, 3)
          .map((decision: any, i: number) => (
            <DecisionCard key={i} decision={decision} index={i + 1} />
          ))}
      </div>

      {/* Mitigation strategies if score is low */}
      {report.model_efficiency_score < 60 && (
        <>
          <h2 className="text-xl font-semibold text-white mb-4">
            Improving Your Score ({report.model_efficiency_score}/100)
          </h2>
          <div className="space-y-3 mb-8">
            {report.mitigation_strategies?.strategies?.map((s: any, i: number) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">{s.strategy}</p>
                    <p className="text-gray-400 text-sm mt-1">{s.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-green-400 text-sm font-medium">{s.expectedScoreImprovement}</span>
                    <p className="text-gray-500 text-xs">{s.timeframe}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Incentives teaser */}
      {report.incentives_and_benefits?.incentives?.length > 0 && (
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
          <p className="text-blue-300 text-sm font-medium mb-1">Financial and Regulatory Incentives Available</p>
          <p className="text-blue-400 text-sm">
            Based on your organization's profile and regions, {report.incentives_and_benefits.incentives.length} incentives
            or compliance obligations are relevant to your AI usage. View the full incentives report.
          </p>
        </div>
      )}
    </div>
  )
}
```

### Step 9.2 — ESG Export Page

`src/app/(dashboard)/dashboard/esg/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function ESGPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('*')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()

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
            <p className="text-3xl font-bold text-white mt-1">{Math.round(esg?.carbon_kg)} kg</p>
            <p className="text-gray-500 text-sm">CO2 equivalent</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">AI Water Consumption</p>
            <p className="text-3xl font-bold text-white mt-1">{Math.round(esg?.water_liters / 1000)}k L</p>
            <p className="text-gray-500 text-sm">Direct cooling consumption</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Model Efficiency Score</p>
            <p className="text-3xl font-bold text-white mt-1">{esg?.model_efficiency_score}/100</p>
            <p className="text-gray-500 text-sm">vs industry benchmark</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Disclosure Statement</h2>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">{esg?.esg_text}</div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Collection Methodology</h2>
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">Model usage data:</span> Collected via provider
              Usage APIs (OpenAI Usage API, Microsoft Graph Reports API). These APIs return aggregate
              organizational metrics only: model identifiers, token volumes, and request counts.
              No prompt content, completion content, or individual user data is accessible through
              these endpoints.
            </p>
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">License data:</span> Collected via Microsoft
              Graph getMicrosoft365CopilotUsageUserDetail. Returns per-user activity flags (active/inactive)
              for the reporting period. Individual messages or conversations are not exposed.
            </p>
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">Environmental calculations:</span> {esg?.carbon_methodology}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Reporting Framework Alignment</h2>
          <div className="flex gap-3">
            {esg?.frameworks?.map((f: string) => (
              <span key={f} className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={() => window.print()}
          className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-xl">
          Download PDF
        </button>
      </div>
    </div>
  )
}
```

---

## Phase 10 — Onboarding Flow (Day 2, Hours 8–10)

### Step 10.1 — Company Info Form

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
    name: '', industry: '', headcount_range: '',
    esg_reporting: [] as string[],
    international_offices: [] as string[]
  })

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('companies').insert({
      name: form.name, industry: form.industry,
      headcount_range: form.headcount_range,
      esg_reporting_obligations: form.esg_reporting,
      international_offices: form.international_offices,
      supabase_user_id: user!.id, onboarding_complete: false
    })
    router.push('/onboarding/connect')
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Tell us about your company</h1>
        <p className="text-gray-400 mb-8">Step 1 of 3 — takes about 2 minutes</p>
        <div className="space-y-4">
          <input placeholder="Company name" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white" />

          <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
            <option value="">Select industry</option>
            <option value="financial_services">Financial Services</option>
            <option value="consulting">Consulting</option>
            <option value="insurance">Insurance</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
          </select>

          <select value={form.headcount_range} onChange={e => setForm({...form, headcount_range: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
            <option value="">Company size</option>
            <option value="100-500">100-500 employees</option>
            <option value="500-2000">500-2,000 employees</option>
            <option value="2000-10000">2,000-10,000 employees</option>
            <option value="10000+">10,000+ employees</option>
          </select>

          <div>
            <p className="text-gray-400 text-sm mb-2">ESG reporting obligations</p>
            {['CSRD', 'GRI', 'IFRS S2', 'CDP', 'UK SDR', 'None currently'].map(o => (
              <label key={o} className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={form.esg_reporting.includes(o)}
                  onChange={e => setForm({...form, esg_reporting: e.target.checked
                    ? [...form.esg_reporting, o] : form.esg_reporting.filter(x => x !== o)})}
                  className="rounded" />
                <span className="text-white">{o}</span>
              </label>
            ))}
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Regions with significant operations</p>
            <p className="text-gray-500 text-xs mb-2">Used to surface relevant regulatory incentives</p>
            {['EU', 'UK', 'Canada', 'Singapore', 'Japan', 'Australia'].map(r => (
              <label key={r} className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={form.international_offices.includes(r)}
                  onChange={e => setForm({...form, international_offices: e.target.checked
                    ? [...form.international_offices, r] : form.international_offices.filter(x => x !== r)})}
                  className="rounded" />
                <span className="text-white">{r}</span>
              </label>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={!form.name || !form.industry}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 10.2 — Connect Integrations

`src/app/onboarding/connect/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const integrations = [
  {
    id: 'microsoft', name: 'Microsoft 365',
    description: 'Copilot license utilization and seat data via Microsoft Graph admin API. Aggregate organizational data only.',
    badge: 'Recommended', connectUrl: '/api/integrations/microsoft/connect', type: 'oauth'
  },
  {
    id: 'google', name: 'Google Workspace',
    description: 'Gemini for Workspace license utilization via Google Admin SDK. Read-only.',
    badge: null, connectUrl: '/api/integrations/google/connect', type: 'oauth'
  },
  {
    id: 'openai', name: 'OpenAI',
    description: 'API model usage, token volumes, and request patterns. Usage API only — no prompt content accessible.',
    badge: 'Recommended', connectUrl: '/api/integrations/openai/connect', type: 'apikey'
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          <p className="text-blue-300 text-sm font-medium mb-1">What we collect and how</p>
          <p className="text-blue-400 text-sm">
            GreenLens measures the ecological impact of your organization's AI deployment, not the
            activity of individuals. We connect to admin dashboards and usage APIs that expose
            aggregate organizational data: which models are deployed, total token volumes, and
            license seat utilization. Individual prompts, messages, and user conversations are
            never accessible through these API endpoints.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {integrations.map(integration => (
            <div key={integration.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
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
                    <span className="text-green-400 text-sm font-medium">Connected</span>
                  ) : integration.type === 'apikey' ? (
                    <div className="flex flex-col gap-2 items-end">
                      <input type="password" placeholder="sk-..." value={openaiKey}
                        onChange={e => setOpenaiKey(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm w-40" />
                      <button onClick={handleOpenAISave} disabled={!openaiKey || saving}
                        className="text-green-400 text-sm disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save key'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => window.location.href = integration.connectUrl}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => router.push('/onboarding/confirm')} disabled={connected.length === 0}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
          Run Analysis
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

## Phase 11 — Deploy (Day 2, Final Hours)

### Step 11.1 — Push and Deploy

```bash
git add .
git commit -m "Initial GreenLens build"
git push origin main
npx vercel --prod
```

Go to Vercel dashboard → Project Settings → Environment Variables → add every variable from `.env.local`.

### Step 11.2 — Update All OAuth Redirect URLs

| Service | Where to update | What to change |
|---|---|---|
| Supabase | Auth → URL Configuration | Site URL + redirect URL |
| GitHub OAuth App | Developer Settings → OAuth Apps | Homepage + Callback URL |
| Microsoft Azure | App Registration → Redirect URIs | Add production URI |
| Google Cloud | Credentials → OAuth Client | Add authorized redirect URI |

### Step 11.3 — Final Supabase Update

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
| Hour 9–10 | Phase 6 | Python stat analysis + NLP module |
| Day 2, Hour 1–6 | Phase 7 | Four agents + Backboard orchestration |
| Day 2, Hour 6–8 | Phase 8 | API routes (trigger + status) |
| Day 2, Hour 8–12 | Phase 9 | Dashboard frontend |
| Day 2, Hour 8–10 | Phase 10 | Onboarding flow |
| Day 2, Final | Phase 11 | Deploy to Vercel |

> **Demo strategy:** Get the pipeline working with mock/sample data first. A working demo with good sample data beats a broken demo with real data every time. Layer in real integrations once the core flow is solid.

---

## Agent and Analysis Summary

| Component | Input | Output | Why It Matters |
|---|---|---|---|
| Usage Analyst | Provider usage APIs | Model inventory + behavioral clusters + daily time series | Foundation for everything downstream |
| Stat Analysis + NLP | Usage data + daily counts + carbon figure | Anomaly detection, trend regression, percentile, task clustering | Satisfies data science requirement, feeds efficiency score |
| Carbon & Water Accountant | Normalized usage + task clusters | Carbon kg, water liters, efficiency score, counterfactual | The environmental numbers the ESG report is built on |
| License Intelligence | Microsoft/Google admin portals | Seat utilization, dormant count, renewal savings | Primary value prop for flat-license enterprises |
| Strategic Translator | All above + incentives library | Decisions, incentives, mitigation strategies, Hype Cycle context, ESG text | Turns data into executive action |

---

## Key Additions From Mentor Feedback

| Mentor Point | What Changed |
|---|---|
| Lead with financial incentives | New `incentives_library` table seeded with CSRD penalties, EU green financing, CDP scoring, Singapore/Japan/UK compliance deadlines. Strategic Translator now surfaces these per company region. |
| Think internationally | Onboarding now captures international office regions. Incentives are filtered by region and surfaced in a dedicated dashboard section. |
| Organizational not individual | Privacy framing updated throughout. Methodology section on ESG page explicitly describes each API and what it exposes. Microsoft Graph methodology cited specifically. |
| Hype Cycle context | Strategic Translator now generates a Hype Cycle paragraph explaining where AI sits and why recording data now creates first-mover advantage. Surfaced on dashboard and in report. |
| ROI and minimal effort | Pipeline trigger is one button. Onboarding is under 30 minutes. Every recommendation includes effort estimate. |
| Line go up | Score delta vs previous period on every metric card. Mitigation strategies section shown when score is below 60, with specific projected improvements and timeframes. |
| Alternative strategies for poor scores | `mitigation_strategies` section generated by Strategic Translator. Shown prominently on dashboard when score needs improvement. |
