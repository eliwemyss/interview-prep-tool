const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const db = require('./lib/database');
const { performResearch } = require('./lib/research');
const { performDeepResearch } = require('./lib/deep-research');
const { performEnhancedResearch } = require('./lib/enhanced-research');
const { generateInterviewBriefing } = require('./lib/interview-briefing');
const { connectGoogleCalendar, getUpcomingEvents, getInterviewEvents, extractCompanyName } = require('./lib/google-calendar');
const { sendPrepEmail } = require('./lib/email');
const { triggerClient } = require('./lib/trigger-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.testConnection();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// DATABASE SETUP
// ============================================

app.post('/api/setup-db', async (req, res) => {
  try {
    await db.initializeTables();
    res.json({ 
      success: true, 
      message: 'Database tables initialized successfully' 
    });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize database',
      details: error.message 
    });
  }
});

// ============================================
// INTEGRATION TESTS
// ============================================

app.get('/api/test/trigger', async (req, res) => {
  try {
    const result = await triggerClient.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

app.get('/api/test/calendar', async (req, res) => {
  try {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    
    res.json({
      configured: hasClientId && hasClientSecret,
      hasClientId,
      hasClientSecret,
      message: hasClientId && hasClientSecret ? 
        'Google OAuth configured' : 
        'Google OAuth not configured'
    });
  } catch (error) {
    res.status(500).json({
      configured: false,
      error: error.message
    });
  }
});

// ============================================
// DATABASE ADMIN ENDPOINTS (temporary - for debugging)
// ============================================

/**
 * DELETE /api/admin/dummy-data
 * Remove all test/dummy companies from database
 */
app.delete('/api/admin/dummy-data', async (req, res) => {
  try {
    const DUMMY_COMPANIES = [
      'Railway', 'PostHog', 'Toast', 'Stripe', 
      'Anthropic', 'Vercel', 'Trigger.dev'
    ];
    
    const result = await db.query(
      'DELETE FROM companies WHERE name = ANY($1::text[]) RETURNING id, name',
      [DUMMY_COMPANIES]
    );
    
    res.json({
      success: true,
      deleted: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Delete dummy data error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/companies
 * List all companies in database
 */
app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, stage, created_at FROM companies ORDER BY created_at DESC'
    );
    res.json({ success: true, companies: result.rows });
  } catch (error) {
    console.error('List companies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RESEARCH ENDPOINTS
// ============================================

/**
 * POST /api/research-direct
 * ASYNC company research via Trigger.dev v3 - returns job ID immediately
 * Frontend polls /api/research-status/:jobId for results
 */
app.post('/api/research-direct', async (req, res) => {
  try {
    const { companyName, companyUrl, role, deepMode = true } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    const jobId = uuidv4();
    console.log(`🚀 [ASYNC] Queuing research job ${jobId} for ${companyName}${role ? ` (${role})` : ''}`);
    
    // Create job record in database
    await db.query(
      `INSERT INTO batch_jobs (id, total_jobs, status, created_at, updated_at) 
       VALUES ($1, 1, 'queued', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [jobId]
    );
    
    // Queue the Trigger.dev job - returns immediately
    // The job will run async in the background
    const triggerResult = await triggerClient.queueResearchJob({
      jobId,
      companyName,
      companyUrl: companyUrl || `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      role: role || 'Software Engineer',
      deepMode
    });
    
    console.log(`✅ Research job queued: ${jobId} (Trigger ID: ${triggerResult.id})`);
    
    // Return immediately with job ID
    res.json({
      success: true,
      jobId,
      triggerId: triggerResult.id,
      company: companyName,
      role: role || 'Software Engineer',
      deepMode,
      statusUrl: `/api/research-status/${jobId}`,
      message: 'Research job queued for processing',
      estimatedDuration: '30-60 seconds',
      checkStatus: 'Poll the statusUrl to check progress'
    });
    
  } catch (error) {
    console.error('Research job queueing error:', error);
    res.status(500).json({
      error: 'Failed to queue research job',
      message: error.message
    });
  }
});

/**
 * GET /api/research-status/:jobId
 * Poll for research job status and results
 */
app.get('/api/research-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job status from database
    const result = await db.query(
      `SELECT * FROM batch_jobs WHERE id = $1`,
      [jobId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job not found',
        jobId
      });
    }
    
    const job = result.rows[0];
    const isComplete = job.status === 'completed';
    const isFailed = job.status === 'failed';
    
    // Parse stored results
    let results = null;
    if (isComplete && job.results) {
      results = typeof job.results === 'string' ? JSON.parse(job.results) : job.results;
    }
    
    res.json({
      jobId,
      status: job.status, // 'queued', 'processing', 'completed', 'failed'
      progress: `${job.completed_jobs || 0}/${job.total_jobs || 1}`,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      isComplete,
      isFailed,
      results: isComplete ? results : null,
      error: isFailed ? job.results?.error : null,
      message: isComplete 
        ? 'Research completed successfully' 
        : isFailed
        ? 'Research job failed'
        : 'Research job in progress'
    });
    
  } catch (error) {
    console.error('Research status check error:', error);
    res.status(500).json({
      error: 'Failed to check job status',
      message: error.message
    });
  }
});

/**
 * POST /api/research-batch
 * Asynchronous batch research via Trigger.dev
 * Queues jobs for processing with proper tracking
 */
app.post('/api/research-batch', async (req, res) => {
  try {
    const { companies } = req.body;
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ error: 'Companies array is required' });
    }
    
    const batchId = uuidv4();
    console.log(`📦 Batch research request for ${companies.length} companies, batch ID: ${batchId}`);
    
    // Create batch in database for tracking
    await db.createBatch(batchId, companies);
    
    // Queue jobs with Trigger.dev
    const jobQueueResult = await triggerClient.queueBatchResearchJobs(
      companies.map(c => ({
        name: typeof c === 'string' ? c : c.name,
        url: typeof c === 'string' ? undefined : c.url,
        role: typeof c === 'string' ? 'Software Engineer' : (c.role || 'Software Engineer')
      }))
    );
    
    console.log(`✅ Queued ${jobQueueResult.totalQueued} jobs via Trigger.dev - Batch: ${batchId}`);
    
    // Start async processing regardless of Trigger.dev status
    // This ensures research completes even if Trigger.dev is down
    processBatchInBackground(batchId, companies);
    
    res.json({
      success: true,
      batchId,
      total: companies.length,
      jobsQueued: jobQueueResult.totalQueued,
      triggerBatchId: jobQueueResult.batchId,
      statusUrl: `/api/batch-status/${batchId}`,
      message: 'Batch processing started via Trigger.dev',
      triggerStatus: jobQueueResult.message
    });
    
  } catch (error) {
    console.error('Batch error:', error);
    res.status(500).json({
      error: 'Batch creation failed',
      message: error.message
    });
  }
});

/**
 * Background batch processing (will be replaced by Trigger.dev)
 */
async function processBatchInBackground(batchId, companies) {
  console.log(`🔄 Processing batch ${batchId} in background...`);
  
  for (const companyName of companies) {
    try {
      const results = await performResearch(companyName);
      await db.upsertCompanyResearch(companyName, results);
      await db.updateBatchProgress(batchId, companyName, results);
      console.log(`✅ Completed ${companyName} for batch ${batchId}`);
    } catch (error) {
      console.error(`❌ Failed ${companyName} for batch ${batchId}:`, error.message);
      await db.updateBatchProgress(batchId, companyName, { error: error.message });
    }
  }
  
  console.log(`✅ Batch ${batchId} completed!`);
}

/**
 * GET /api/batch-status/:batchId
 * Check batch processing status
 */
app.get('/api/batch-status/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await db.getBatchStatus(batchId);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json({
      batchId: batch.batch_id,
      total: batch.total,
      completed: batch.completed,
      status: batch.status,
      results: batch.results,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at
    });
    
  } catch (error) {
    console.error('Batch status error:', error);
    res.status(500).json({
      error: 'Failed to get batch status',
      message: error.message
    });
  }
});

// ============================================
// PIPELINE ENDPOINTS
// ============================================

/**
 * GET /api/pipeline
 * Get all companies in the interview pipeline
 */
app.get('/api/pipeline', async (req, res) => {
  try {
    const companies = await db.getAllCompanies();
    
    res.json({
      success: true,
      count: companies.length,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        stage: c.stage,
        nextInterview: c.interview_date,
        lastResearched: c.last_researched,
        researchData: c.research_data,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
    
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({
      error: 'Failed to get pipeline',
      message: error.message
    });
  }
});

/**
 * POST /api/pipeline
 * Add company to pipeline
 */
app.post('/api/pipeline', async (req, res) => {
  try {
    const { companyName, stage, nextInterview, notes } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    const company = await db.addCompanyToPipeline(
      companyName,
      stage || 'applied',
      nextInterview || null,
      notes || null
    );
    
    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        stage: company.stage,
        nextInterview: company.interview_date,
        notes: company.notes
      }
    });
    
  } catch (error) {
    console.error('Add to pipeline error:', error);
    res.status(500).json({
      error: 'Failed to add to pipeline',
      message: error.message
    });
  }
});

/**
 * PUT /api/pipeline/:id
 * Update company in pipeline
 */
app.put('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const company = await db.updateCompany(parseInt(id), updates);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        stage: company.stage,
        nextInterview: company.interview_date,
        notes: company.notes
      }
    });
    
  } catch (error) {
    console.error('Update pipeline error:', error);
    res.status(500).json({
      error: 'Failed to update company',
      message: error.message
    });
  }
});

/**
 * DELETE /api/pipeline/:id
 * Remove company from pipeline
 */
app.delete('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await db.deleteCompany(parseInt(id));
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({
      success: true,
      message: 'Company removed from pipeline',
      company: company.name
    });
    
  } catch (error) {
    console.error('Delete pipeline error:', error);
    res.status(500).json({
      error: 'Failed to delete company',
      message: error.message
    });
  }
});

/**
 * POST /api/pipeline/:id/refresh
 * Manually trigger research refresh for a company
 */
app.post('/api/pipeline/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await db.getCompanyById(parseInt(id));
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    console.log(`🔄 Refreshing research for: ${company.name}`);
    
    // Perform research
    const results = await performResearch(company.name);
    
    // Update in database
    await db.upsertCompanyResearch(company.name, results);
    
    res.json({
      success: true,
      company: company.name,
      message: 'Research refreshed successfully',
      data: results
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: 'Failed to refresh research',
      message: error.message
    });
  }
});

// ============================================
// CALENDAR INTEGRATION ENDPOINTS
// ============================================

/**
 * GET /api/calendar/connect
 * Start Google Calendar OAuth flow
 */
app.get('/api/calendar/connect', (req, res) => {
  try {
    const authUrl = connectGoogleCalendar();
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Calendar connect error:', error);
    res.status(500).json({
      error: 'Failed to connect calendar',
      message: error.message
    });
  }
});

/**
 * GET /api/calendar/callback
 * OAuth callback handler
 */
app.get('/api/calendar/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }
    
    // TODO: Handle OAuth token exchange
    res.send('<h1>Calendar Connected!</h1><p>You can close this window.</p>');
    
  } catch (error) {
    console.error('Calendar callback error:', error);
    res.status(500).send('Error connecting calendar');
  }
});

/**
 * GET /api/calendar/events
 * Get upcoming calendar events
 */
app.get('/api/calendar/events', async (req, res) => {
  try {
    const events = await db.getUpcomingCalendarEvents(7);
    
    res.json({
      success: true,
      count: events.length,
      events
    });
    
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({
      error: 'Failed to get calendar events',
      message: error.message
    });
  }
});

/**
 * POST /api/calendar/sync
 * Manually trigger calendar sync
 */
app.post('/api/calendar/sync', async (req, res) => {
  try {
    // TODO: Implement calendar sync logic
    res.json({
      success: true,
      message: 'Calendar sync triggered',
      note: 'This feature requires Google Calendar OAuth setup'
    });
    
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({
      error: 'Failed to sync calendar',
      message: error.message
    });
  }
});

// ============================================
// INTERVIEW REMINDER EMAILS (24H BEFORE)
// ============================================

app.post('/api/notifications/interview-reminders', async (req, res) => {
  try {
    const hoursAhead = Number(req.body?.hoursAhead || 24);
    const windowMinutes = Number(req.body?.windowMinutes || 90);
    const recipient = req.body?.email || process.env.EMAIL_TO || process.env.SMTP_USER;

    if (!recipient) {
      return res.status(400).json({
        error: 'Recipient email not configured. Set EMAIL_TO or SMTP_USER, or pass email in body.'
      });
    }

    const events = await db.getEventsNeedingReminder(hoursAhead, windowMinutes);

    if (events.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        message: `No interviews starting in ~${hoursAhead}h window`
      });
    }

    const results = [];

    for (const event of events) {
      const companyName = event.company_name || extractCompanyName(event.summary) || event.summary || 'Interview';
      const emailEvent = {
        start: { dateTime: event.start_time },
        end: { dateTime: event.end_time },
        location: event.location || '',
        summary: event.summary
      };

      try {
        await sendPrepEmail(companyName, emailEvent, event.research_data, recipient);
        await db.markEventReminderSent(event.event_id);
        results.push({ eventId: event.event_id, company: companyName, status: 'sent' });
      } catch (err) {
        console.error('Reminder send error:', err.message);
        results.push({ eventId: event.event_id, company: companyName, status: 'failed', error: err.message });
      }
    }

    res.json({
      success: true,
      sent: results.filter(r => r.status === 'sent').length,
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Reminder endpoint error:', error);
    res.status(500).json({
      error: 'Failed to send reminders',
      message: error.message
    });
  }
});

// ============================================
// SERVE FRONTEND
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Interview Prep Tool Server');
  console.log('='.repeat(50));
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  const dbHealth = await db.testConnection();
  if (dbHealth.healthy) {
    console.log(`✅ Database connected`);
  } else {
    console.log(`❌ Database connection failed: ${dbHealth.error}`);
  }
  
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/research-direct');
  console.log('  POST /api/research-batch');
  console.log('  GET  /api/batch-status/:batchId');
  console.log('  GET  /api/pipeline');
  console.log('  POST /api/pipeline');
  console.log('  PUT  /api/pipeline/:id');
  console.log('  DELETE /api/pipeline/:id');
  console.log('  POST /api/pipeline/:id/refresh');
  console.log('  GET  /api/calendar/connect');
  console.log('  GET  /api/calendar/events');
  console.log('  POST /api/calendar/sync');
  console.log('\n📱 Frontend:');
  console.log(`  Main: http://localhost:${PORT}`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
  console.log('='.repeat(50) + '\n');
});

module.exports = app;
