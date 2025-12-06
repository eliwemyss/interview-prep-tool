-- Add Gmail integration fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);

-- Create index for email thread lookups
CREATE INDEX IF NOT EXISTS idx_companies_email_thread ON companies(email_thread_id) WHERE email_thread_id IS NOT NULL;
