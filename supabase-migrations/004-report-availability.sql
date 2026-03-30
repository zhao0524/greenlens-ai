-- Add partial-report contract fields to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_mode TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS section_availability JSONB;

NOTIFY pgrst, 'reload schema';
