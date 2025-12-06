-- Add salary calculator fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_research_data JSONB;

-- Create index for salary queries
CREATE INDEX IF NOT EXISTS idx_companies_salary ON companies(salary_target_min, salary_target_max) WHERE salary_target_min IS NOT NULL;
