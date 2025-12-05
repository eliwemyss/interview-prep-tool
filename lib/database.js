const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize database tables
 */
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        research_data JSONB,
        interview_date TIMESTAMP,
        stage VARCHAR(50) DEFAULT 'research',
        notes TEXT,
        last_researched TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create research_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_history (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        research_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create calendar_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        summary TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        prep_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create batch_jobs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id VARCHAR(50) PRIMARY KEY,
        total_jobs INTEGER NOT NULL,
        completed_jobs INTEGER DEFAULT 0,
        failed_jobs INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'running',
        results JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_interview_date ON companies(interview_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_research_history_company ON research_history(company_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON calendar_events(company_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status)');
    
    // Create triggers
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
      CREATE TRIGGER update_companies_updated_at 
        BEFORE UPDATE ON companies 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_batch_jobs_updated_at ON batch_jobs;
      CREATE TRIGGER update_batch_jobs_updated_at 
        BEFORE UPDATE ON batch_jobs 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database tables initialized');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// COMPANY OPERATIONS
// ============================================

/**
 * Upsert company research data
 */
async function upsertCompanyResearch(companyName, researchData) {
  const query = `
    INSERT INTO companies (name, research_data, last_researched, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    ON CONFLICT (name) 
    DO UPDATE SET 
      research_data = $2,
      last_researched = NOW(),
      updated_at = NOW()
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [companyName, JSON.stringify(researchData)]);
    
    // Also save to research history
    if (result.rows[0]) {
      await addResearchHistory(result.rows[0].id, researchData);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error upserting company research:', error);
    throw error;
  }
}

/**
 * Get all companies in the pipeline
 */
async function getAllCompanies() {
  const query = `
    SELECT * FROM companies 
    ORDER BY 
      CASE 
        WHEN interview_date IS NOT NULL THEN 0 
        ELSE 1 
      END,
      interview_date ASC NULLS LAST,
      updated_at DESC
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting all companies:', error);
    throw error;
  }
}

/**
 * Get active companies (not rejected or offered)
 */
async function getActiveCompanies() {
  const query = `
    SELECT * FROM companies 
    WHERE stage NOT IN ('rejected', 'offer') OR stage IS NULL
    ORDER BY next_interview ASC NULLS LAST
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting active companies:', error);
    throw error;
  }
}

/**
 * Get company by name
 */
async function getCompany(companyName) {
  const query = 'SELECT * FROM companies WHERE name = $1';
  
  try {
    const result = await pool.query(query, [companyName]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting company:', error);
    throw error;
  }
}

/**
 * Get company by ID
 */
async function getCompanyById(id) {
  const query = 'SELECT * FROM companies WHERE id = $1';
  
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting company by ID:', error);
    throw error;
  }
}

/**
 * Add or update company in pipeline
 */
async function addCompanyToPipeline(companyName, stage, nextInterview, notes) {
  const query = `
    INSERT INTO companies (name, stage, interview_date, notes, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (name) 
    DO UPDATE SET 
      stage = $2,
      interview_date = $3,
      notes = $4,
      updated_at = NOW()
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [companyName, stage, nextInterview, notes]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding company to pipeline:', error);
    throw error;
  }
}

/**
 * Update company details
 */
async function updateCompany(id, updates) {
  const allowedFields = ['stage', 'next_interview', 'notes'];
  const setClauses = [];
  const values = [];
  let paramCount = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }
  
  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  const query = `
    UPDATE companies 
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating company:', error);
    throw error;
  }
}

/**
 * Delete company from pipeline
 */
async function deleteCompany(id) {
  const query = 'DELETE FROM companies WHERE id = $1 RETURNING *';
  
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}

// ============================================
// RESEARCH HISTORY OPERATIONS
// ============================================

/**
 * Add research to history
 */
async function addResearchHistory(companyId, researchData) {
  const query = `
    INSERT INTO research_history (company_id, research_data)
    VALUES ($1, $2)
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [companyId, JSON.stringify(researchData)]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding research history:', error);
    throw error;
  }
}

/**
 * Get research history for a company
 */
async function getResearchHistory(companyId, limit = 10) {
  const query = `
    SELECT * FROM research_history 
    WHERE company_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `;
  
  try {
    const result = await pool.query(query, [companyId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting research history:', error);
    throw error;
  }
}

// ============================================
// BATCH JOB OPERATIONS
// ============================================

/**
 * Create a new batch job
 */
async function createBatch(batchId, companies) {
  const query = `
    INSERT INTO batch_jobs (batch_id, companies, total, completed, status)
    VALUES ($1, $2, $3, 0, 'processing')
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [batchId, companies, companies.length]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating batch:', error);
    throw error;
  }
}

/**
 * Update batch progress
 */
async function updateBatchProgress(batchId, companyName, results) {
  const query = `
    UPDATE batch_jobs 
    SET 
      completed = completed + 1,
      results = results || $2::jsonb,
      status = CASE 
        WHEN completed + 1 >= total THEN 'completed'
        ELSE 'processing'
      END,
      updated_at = NOW()
    WHERE batch_id = $1
    RETURNING *
  `;
  
  const resultObject = {
    company: companyName,
    data: results,
    completedAt: new Date().toISOString()
  };
  
  try {
    const result = await pool.query(query, [batchId, JSON.stringify([resultObject])]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating batch progress:', error);
    throw error;
  }
}

/**
 * Get batch job status
 */
async function getBatchStatus(batchId) {
  const query = 'SELECT * FROM batch_jobs WHERE batch_id = $1';
  
  try {
    const result = await pool.query(query, [batchId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting batch status:', error);
    throw error;
  }
}

// ============================================
// CALENDAR EVENT OPERATIONS
// ============================================

/**
 * Add calendar event
 */
async function addCalendarEvent(calendarEventId, companyId, eventTitle, eventDate) {
  // Store the Google event using the schema that exists in production: event_id, summary, start_time
  const query = `
    INSERT INTO calendar_events (event_id, company_id, summary, start_time)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (event_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      start_time = EXCLUDED.start_time
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [calendarEventId, companyId, eventTitle, eventDate]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding calendar event:', error);
    throw error;
  }
}

/**
 * Check if prep email was sent for event
 */
async function checkPrepEmailStatus(calendarEventId) {
  const query = 'SELECT prep_sent FROM calendar_events WHERE event_id = $1';
  
  try {
    const result = await pool.query(query, [calendarEventId]);
    return result.rows[0]?.prep_sent || false;
  } catch (error) {
    console.error('Error checking prep email status:', error);
    throw error;
  }
}

/**
 * Mark prep email as sent
 */
async function markPrepEmailSent(calendarEventId) {
  const query = `
    UPDATE calendar_events 
    SET prep_sent = true 
    WHERE event_id = $1
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [calendarEventId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error marking prep email sent:', error);
    throw error;
  }
}

/**
 * Get upcoming calendar events
 */
async function getUpcomingCalendarEvents(days = 7) {
  // Use start_time column (present in production) instead of the removed event_date column
  const query = `
    SELECT ce.*, c.name as company_name, c.research_data
    FROM calendar_events ce
    LEFT JOIN companies c ON ce.company_id = c.id
    WHERE ce.start_time >= NOW()
      AND ce.start_time <= NOW() + INTERVAL '${days} days'
    ORDER BY ce.start_time ASC
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting upcoming calendar events:', error);
    throw error;
  }
}

// Get events that start in the next window (default: 24h ±60m) and still need reminders
async function getEventsNeedingReminder(hoursAhead = 24, windowMinutes = 60) {
  const query = `
    SELECT ce.*, c.name as company_name, c.research_data
    FROM calendar_events ce
    LEFT JOIN companies c ON ce.company_id = c.id
    WHERE ce.start_time BETWEEN NOW() + ($1 || ' hours')::interval
      AND NOW() + ($1 || ' hours')::interval + ($2 || ' minutes')::interval
      AND (ce.prep_sent IS FALSE OR ce.prep_sent IS NULL)
    ORDER BY ce.start_time ASC
  `;

  try {
    const result = await pool.query(query, [hoursAhead, windowMinutes]);
    return result.rows;
  } catch (error) {
    console.error('Error getting events needing reminder:', error);
    throw error;
  }
}

// Mark a calendar event reminder as sent
async function markEventReminderSent(eventId) {
  const query = `
    UPDATE calendar_events
    SET prep_sent = true
    WHERE event_id = $1
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [eventId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error marking event reminder sent:', error);
    throw error;
  }
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, error: error.message };
  }
}

module.exports = {
  pool,
  // Company operations
  upsertCompanyResearch,
  getAllCompanies,
  getActiveCompanies,
  getCompany,
  getCompanyById,
  addCompanyToPipeline,
  updateCompany,
  deleteCompany,
  // Research history
  addResearchHistory,
  getResearchHistory,
  // Batch operations
  createBatch,
  updateBatchProgress,
  getBatchStatus,
  // Job operations (for Trigger.dev)
  query: (sql, params) => pool.query(sql, params),
  // Calendar operations
  addCalendarEvent,
  checkPrepEmailStatus,
  markPrepEmailSent,
  getUpcomingCalendarEvents,
  getEventsNeedingReminder,
  markEventReminderSent,
  // Health check
  testConnection,
  // Database setup
  initializeTables
};
