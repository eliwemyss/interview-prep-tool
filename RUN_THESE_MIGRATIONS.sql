-- Copy and paste this ENTIRE block into Railway PostgreSQL Query tab
-- Then click "Run Query"

-- Migration 004: Add Gmail fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_companies_email_thread ON companies(email_thread_id) WHERE email_thread_id IS NOT NULL;

-- Migration 005: Add Salary fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_research_data JSONB;
CREATE INDEX IF NOT EXISTS idx_companies_salary ON companies(salary_target_min, salary_target_max) WHERE salary_target_min IS NOT NULL;

-- Verify migrations ran successfully
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;
