-- =============================================================================
-- GreenLens — wipe ALL tenant data (every company and dependent rows)
-- =============================================================================
-- Run in Supabase SQL Editor when you want a completely empty app state.
-- Does NOT delete: auth.users, incentives_library, model_energy_library,
-- regional_carbon_intensity (reference / seed tables).
--
-- Cascades automatically remove:
--   integrations, analysis_jobs, agent_outputs, reports
-- =============================================================================

DELETE FROM companies;

-- Verify nothing left:
-- SELECT COUNT(*) FROM companies;  -- expect 0
