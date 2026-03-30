-- Safe to re-run.
ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

DELETE FROM agent_outputs older
USING agent_outputs newer
WHERE older.job_id = newer.job_id
  AND older.agent_name = newer.agent_name
  AND (
    older.completed_at < newer.completed_at
    OR (older.completed_at = newer.completed_at AND older.id::text < newer.id::text)
  );

DELETE FROM reports older
USING reports newer
WHERE older.job_id = newer.job_id
  AND older.job_id IS NOT NULL
  AND (
    older.created_at < newer.created_at
    OR (older.created_at = newer.created_at AND older.id::text < newer.id::text)
  );

CREATE UNIQUE INDEX IF NOT EXISTS agent_outputs_job_id_agent_name_key
  ON agent_outputs(job_id, agent_name);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_job_id_key;
DROP INDEX IF EXISTS reports_job_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'reports' AND c.conname = 'reports_job_id_key'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_job_id_key UNIQUE (job_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
