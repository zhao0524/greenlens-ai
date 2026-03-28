-- Repair older reports tables that predate the latest dashboard summary fields.
-- Safe to re-run.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS trend_direction TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS carbon_percentile DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS mitigation_strategies JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_carbon_kg DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_water_liters DECIMAL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS prev_model_efficiency_score INTEGER;

-- Ask PostgREST to reload its schema cache after the repair.
NOTIFY pgrst, 'reload schema';
