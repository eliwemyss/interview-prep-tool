-- ========================================
-- RUN THIS IN RAILWAY POSTGRESQL QUERY TAB
-- ========================================
-- This file contains ALL database migrations
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ========================================

-- MIGRATION 001: Initial Schema
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  stage VARCHAR(50) CHECK(stage IN ('applied', 'screening', 'technical', 'final', 'offer', 'rejected')),
  last_researched TIMESTAMP WITH TIME ZONE,
  next_interview TIMESTAMP WITH TIME ZONE,
  research_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  research_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  calendar_event_id VARCHAR(255) UNIQUE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  event_title VARCHAR(500),
  event_date TIMESTAMP WITH TIME ZONE,
  prep_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  companies TEXT[],
  total INTEGER,
  completed INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_next_interview ON companies(next_interview);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_prep_sent ON calendar_events(prep_sent);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_batch_id ON batch_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_batch_jobs_updated_at ON batch_jobs;
CREATE TRIGGER update_batch_jobs_updated_at
    BEFORE UPDATE ON batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION 004: Gmail Fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_companies_email_thread ON companies(email_thread_id) WHERE email_thread_id IS NOT NULL;

-- MIGRATION 005: Salary Fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_research_data JSONB;
CREATE INDEX IF NOT EXISTS idx_companies_salary ON companies(salary_target_min, salary_target_max) WHERE salary_target_min IS NOT NULL;

-- ========================================
-- DONE! All migrations applied
-- ========================================
