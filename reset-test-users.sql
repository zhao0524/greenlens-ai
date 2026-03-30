-- Reset only specific test users (by email).
-- To delete EVERY company instead, use reset-all-tenant-data.sql
--
-- Deletes all company data for the given emails.
-- Because all tables have ON DELETE CASCADE from companies,
-- this also removes: integrations, analysis_jobs, agent_outputs, reports.
-- Auth accounts are preserved so the users can log in and onboard fresh.

DELETE FROM companies
WHERE supabase_user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'rohan.gottipati@gmail.com',
    'davidzhao0524@gmail.com',
    'krishbhoopati556@gmail.com'
  )
);

-- Confirm — should return 0 rows for each email after the delete:
SELECT u.email, c.id AS company_id, c.name
FROM auth.users u
LEFT JOIN companies c ON c.supabase_user_id = u.id
WHERE u.email IN (
  'rohan.gottipati@gmail.com',
  'davidzhao0524@gmail.com',
  'krishbhoopati556@gmail.com'
);
