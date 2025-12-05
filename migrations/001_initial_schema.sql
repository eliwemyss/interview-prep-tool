-- Interview Prep Tool - PostgreSQL Schema
-- Version: 2.0.0
-- Description: Complete database schema for AI-powered interview preparation tool

-- Companies table - tracks all companies in the interview pipeline
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  stage VARCHAR(50) CHECK(stage IN ('applied', 'screening', 'technical', 'final', 'offer', 'rejected')),
  last_researched TIMESTAMP WITH TIME ZONE,
  next_interview TIMESTAMP WITH TIME ZONE,
  research_data JSONB, -- Store full research as JSON
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Research history - keep track of all research versions for comparison
CREATE TABLE IF NOT EXISTS research_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  research_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar events - track interview events from Google Calendar
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  calendar_event_id VARCHAR(255) UNIQUE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  event_title VARCHAR(500),
  event_date TIMESTAMP WITH TIME ZONE,
  prep_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Batch jobs - track multi-company research jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  companies TEXT[], -- Array of company names
  total INTEGER,
  completed INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_next_interview ON companies(next_interview);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_prep_sent ON calendar_events(prep_sent);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_batch_id ON batch_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on companies table
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on batch_jobs table
DROP TRIGGER IF EXISTS update_batch_jobs_updated_at ON batch_jobs;
CREATE TRIGGER update_batch_jobs_updated_at
    BEFORE UPDATE ON batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial test data (optional - for development)
-- INSERT INTO companies (name, stage, next_interview, notes) VALUES
-- ('Railway', 'technical', CURRENT_TIMESTAMP + INTERVAL '2 days', 'Focus on infrastructure and deployment'),
-- ('PostHog', 'screening', CURRENT_TIMESTAMP + INTERVAL '5 days', 'Product analytics company'),
-- ('Toast', 'applied', NULL, 'Restaurant POS system')
-- ON CONFLICT (name) DO NOTHING;
