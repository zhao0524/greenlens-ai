import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function assertReportsRepairUsesConstraint(relativePath: string) {
  const sql = readRepoFile(relativePath)

  assert.match(
    sql,
    /ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_job_id_key;/,
    `${relativePath} should drop the reports unique constraint before recreating it`
  )
  assert.match(
    sql,
    /DROP INDEX IF EXISTS reports_job_id_key;/,
    `${relativePath} should remove any legacy reports_job_id_key index`
  )
  assert.match(
    sql,
    /ADD CONSTRAINT reports_job_id_key UNIQUE \(job_id\);/,
    `${relativePath} should recreate reports_job_id_key as a unique constraint`
  )
  assert.doesNotMatch(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS reports_job_id_key\s+ON reports\(job_id\)\s+WHERE job_id IS NOT NULL;/,
    `${relativePath} should not recreate reports_job_id_key as a partial unique index`
  )
  assert.match(
    sql,
    /NOTIFY pgrst, 'reload schema';/,
    `${relativePath} should request a PostgREST schema reload`
  )
}

test('reports schema repair uses a unique constraint across setup and migration SQL', () => {
  assertReportsRepairUsesConstraint('DATABASE_FULL_SETUP.sql')
  assertReportsRepairUsesConstraint('supabase-setup.sql')
  assertReportsRepairUsesConstraint('supabase-migrations/003-analysis-job-resume.sql')
})
