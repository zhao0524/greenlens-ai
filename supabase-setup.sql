-- GreenLens AI — legacy setup (kept for reference)
-- Canonical script: DATABASE_FULL_SETUP.sql
-- To wipe companies first: reset-all-tenant-data.sql

-- ── STEP 1: COMPANIES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  industry TEXT,
  headcount_range TEXT,
  primary_use_cases TEXT[],
  esg_reporting_obligations TEXT[],
  international_offices TEXT[],
  supabase_user_id UUID REFERENCES auth.users(id),
  onboarding_complete BOOLEAN DEFAULT FALSE
);

-- ── STEP 2: INTEGRATIONS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(company_id, provider)
);

-- ── STEP 3: ANALYSIS JOBS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  current_agent TEXT,
  error_message TEXT,
  backboard_thread_id TEXT
);

-- ── STEP 4: AGENT OUTPUTS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  output JSONB NOT NULL
);

-- ── STEP 5: REPORTS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES analysis_jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reporting_period TEXT NOT NULL,
  carbon_kg DECIMAL,
  water_liters DECIMAL,
  model_efficiency_score INTEGER,
  license_utilization_rate DECIMAL,
  anomaly_detected BOOLEAN DEFAULT FALSE,
  trend_direction TEXT,
  carbon_percentile DECIMAL,
  executive_summary JSONB,
  footprint_detail JSONB,
  model_efficiency_analysis JSONB,
  stat_analysis JSONB,
  license_intelligence JSONB,
  strategic_decisions JSONB,
  incentives_and_benefits JSONB,
  benchmark_data JSONB,
  esg_disclosure JSONB,
  mitigation_strategies JSONB,
  prev_carbon_kg DECIMAL,
  prev_water_liters DECIMAL,
  prev_model_efficiency_score INTEGER,
  pdf_url TEXT
);

-- Repair older reports tables that predate the latest dashboard summary fields
ALTER TABLE reports ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS trend_direction TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS carbon_percentile DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS mitigation_strategies JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_carbon_kg DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_water_liters DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_model_efficiency_score INTEGER;

-- ── STEP 6: INCENTIVES LIBRARY ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incentives_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  incentive_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_value TEXT,
  applicable_industries TEXT[],
  deadline TEXT,
  source_url TEXT,
  last_verified TIMESTAMPTZ DEFAULT NOW()
);

-- Seed incentives (insert only if empty)
INSERT INTO incentives_library
(region, incentive_type, title, description, estimated_value, applicable_industries, deadline, source_url)
SELECT * FROM (VALUES
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
   'https://www.bcorporation.net')
) AS v(region, incentive_type, title, description, estimated_value, applicable_industries, deadline, source_url)
WHERE NOT EXISTS (SELECT 1 FROM incentives_library LIMIT 1);

-- ── STEP 7: MODEL ENERGY LIBRARY ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS model_energy_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_identifier TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  model_class TEXT NOT NULL,
  energy_wh_per_1k_input_tokens DECIMAL NOT NULL,
  energy_wh_per_1k_output_tokens DECIMAL NOT NULL,
  relative_efficiency_score INTEGER NOT NULL,
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
 'ArXiv 2505.09598')
ON CONFLICT (model_identifier) DO NOTHING;

-- ── STEP 8: REGIONAL CARBON INTENSITY ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS regional_carbon_intensity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_identifier TEXT UNIQUE NOT NULL,
  provider TEXT,
  carbon_intensity_gco2_per_kwh DECIMAL NOT NULL,
  water_usage_effectiveness DECIMAL DEFAULT 1.9,
  water_stress_multiplier DECIMAL DEFAULT 1.0,
  data_source TEXT
);

INSERT INTO regional_carbon_intensity
(id, region_identifier, provider, carbon_intensity_gco2_per_kwh, water_usage_effectiveness, water_stress_multiplier, data_source)
VALUES
(gen_random_uuid(), 'us-east-1', 'aws', 320.5, 1.9, 1.2, 'EPA eGRID 2024'),
(gen_random_uuid(), 'us-west-2', 'aws', 118.3, 1.6, 1.8, 'EPA eGRID 2024'),
(gen_random_uuid(), 'eu-west-1', 'aws', 82.4, 1.4, 0.9, 'IEA Europe 2024'),
(gen_random_uuid(), 'eastus', 'azure', 298.7, 1.9, 1.2, 'EPA eGRID 2024'),
(gen_random_uuid(), 'westeurope', 'azure', 89.2, 1.3, 0.8, 'IEA Europe 2024'),
(gen_random_uuid(), 'us-central1', 'google', 245.6, 1.7, 1.5, 'EPA eGRID 2024'),
(gen_random_uuid(), 'europe-west1', 'google', 76.8, 1.2, 0.7, 'IEA Europe 2024'),
(gen_random_uuid(), 'default', null, 300.0, 1.9, 1.2, 'Global average estimate')
ON CONFLICT (region_identifier) DO NOTHING;

-- ── STEP 9: ROW LEVEL SECURITY ────────────────────────────────────────────────

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "Users see own company" ON companies;
DROP POLICY IF EXISTS "Users see own integrations" ON integrations;
DROP POLICY IF EXISTS "Users see own jobs" ON analysis_jobs;
DROP POLICY IF EXISTS "Users see own reports" ON reports;

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

-- Reference tables: allow all authenticated users to read
ALTER TABLE model_energy_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_carbon_intensity ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read model library" ON model_energy_library;
DROP POLICY IF EXISTS "Authenticated read regional carbon" ON regional_carbon_intensity;
DROP POLICY IF EXISTS "Authenticated read incentives" ON incentives_library;

CREATE POLICY "Authenticated read model library" ON model_energy_library
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated read regional carbon" ON regional_carbon_intensity
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated read incentives" ON incentives_library
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
