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
const { connectGoogleCalendar, getUpcomingEvents, getInterviewEvents, extractCompanyName, extractJobTitle, normalizeCompanyName } = require('./lib/google-calendar');
const { sendPrepEmail } = require('./lib/email');
const { triggerClient } = require('./lib/trigger-client');
const Anthropic = require('@anthropic-ai/sdk');

// PostHog Analytics
let posthog = null;
if (process.env.POSTHOG_API_KEY) {
  const { PostHog } = require('posthog-node');
  posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com'
  });
}

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

app.post('/api/run-migrations', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    console.log('🔄 Running database migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const results = [];

    for (const file of migrationFiles) {
      console.log(`📄 Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await db.query(sql);
      results.push(`✅ ${file} completed`);
      console.log(`✅ ${file} completed`);
    }

    console.log('✅ All migrations completed successfully');

    res.json({
      success: true,
      message: 'All migrations completed successfully',
      migrations: results
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
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
      'Railway', 'Toast', 'Stripe', 
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
    // Return HTML page that immediately redirects
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting Google Calendar...</title>
      </head>
      <body>
        <p>Redirecting to Google OAuth...</p>
        <script>
          window.location.href = '${authUrl}';
        </script>
      </body>
      </html>
    `);
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
    
    // Exchange authorization code for tokens
    const googleCalendar = require('./lib/google-calendar');
    const tokens = await googleCalendar.getTokensFromCode(code);
    
    if (tokens.refresh_token) {
      // Save refresh token to Railway environment
      console.log(`✅ Got Google refresh token, saving to environment`);
      // Note: In production, this would need an admin endpoint to set env vars
      // For now, we'll store it in memory and the user needs to set it manually
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
      
      res.send(`
        <html>
          <head><title>Calendar Connected</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>✅ Calendar Connected!</h1>
            <p>Your Google Calendar has been successfully connected.</p>
            <p>Your refresh token:</p>
            <code style="background: #f0f0f0; padding: 10px; display: block; margin: 20px 0; word-break: break-all;">
              ${tokens.refresh_token}
            </code>
            <p><strong>Important:</strong> Save this token and run:</p>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: left; display: inline-block;">
railway variables --set "GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}"
            </pre>
            <p>Then: <code>railway redeploy</code></p>
            <p><a href="/">← Go back to dashboard</a></p>
          </body>
        </html>
      `);
    } else {
      res.send('<h1>⚠️ No refresh token received</h1><p>The connection may not have offline access. Try connecting again.</p>');
    }
    
  } catch (error) {
    console.error('Calendar callback error:', error);
    res.status(500).send(`<h1>Error connecting calendar</h1><p>${error.message}</p>`);
  }
});

/**
 * GET /api/calendar/events
 * Get upcoming calendar events from Google Calendar
 */
app.get('/api/calendar/events', async (req, res) => {
  try {
    const googleCalendar = require('./lib/google-calendar');
    
    // Fetch live INTERVIEW events from Google Calendar (auto-filtered)
    const events = await googleCalendar.getInterviewEvents(14);
    
    // Events are already formatted by getInterviewEvents, just normalize field names
    const formattedEvents = events.map(event => ({
      event_id: event.id,
      summary: event.summary,
      start_time: event.startTime,
      end_time: event.endTime,
      company_name: event.companyName,
      description: event.description || '',
      location: event.location || ''
    }));
    
    res.json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents
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
 * Manually trigger calendar sync with deduplication
 */
app.post('/api/calendar/sync', async (req, res) => {
  try {
    const googleCalendar = require('./lib/google-calendar');
    
    // Fetch interview events from Google Calendar
    const events = await googleCalendar.getInterviewEvents(14);
    
    const syncResults = {
      total: events.length,
      synced: 0,
      skipped: 0,
      researched: 0,
      deduplicated: 0,
      companies: []
    };
    
    // Deduplicate by company name + interview date (to prevent duplicates)
    const seenCompanies = new Set();
    
    // Process each event
    for (const event of events) {
      let companyName = event.companyName; // Already extracted by getInterviewEvents
      
      if (!companyName) {
        syncResults.skipped++;
        continue;
      }
      
      // Normalize company name to prevent duplicates
      companyName = normalizeCompanyName(companyName);
      
      // Create dedup key: company name + date (without time)
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      const dedupKey = `${companyName}|${eventDate}`;
      
      if (seenCompanies.has(dedupKey)) {
        syncResults.deduplicated++;
        continue;
      }
      seenCompanies.add(dedupKey);
      
      // Check if company already has research
      let existingCompany = await db.getCompany(companyName);
      
      const jobTitle = event.jobTitle || null;

      // If company doesn't exist, create it
      if (!existingCompany) {
        await db.addCompanyToPipeline(companyName, 'screening', event.startTime, `Auto-added from calendar: ${event.summary}`);
        existingCompany = await db.getCompany(companyName);
      }

      // If we have a job title, refresh notes when they are empty or auto-generated
      if (existingCompany && jobTitle) {
        const notes = existingCompany.notes || '';
        const looksAuto = notes.startsWith('Auto-added from calendar') || notes.startsWith('Job Title:');
        if (!notes || looksAuto) {
          await db.query(
            `UPDATE companies SET notes = $1 WHERE id = $2`,
            [`Job Title: ${jobTitle}`, existingCompany.id]
          );
          // Refresh the in-memory object so downstream logic sees the update
          existingCompany = await db.getCompany(companyName);
        }
      }
      
      // Store calendar event in database
      if (existingCompany) {
        await db.addCalendarEvent(
          event.id,
          existingCompany.id,
          event.summary.substring(0, 250), // Truncate to fit VARCHAR(255)
          event.startTime
        );
        syncResults.synced++;
      }
      
      // Auto-trigger research if company has no research data
      if (!existingCompany.research_data && triggerClient) {
        // Auto-trigger research for new companies
        const jobId = uuidv4();
        const payload = {
          jobId,
          companyName,
          companyUrl: null,
          role: event.jobTitle || 'Software Engineer',
          deepMode: true
        };
        
        try {
          await triggerClient.queueResearchJob(payload);
          syncResults.researched++;
          syncResults.companies.push({
            name: companyName,
            status: 'research_queued',
            jobId
          });
        } catch (triggerError) {
          console.warn(`Failed to queue research for ${companyName}:`, triggerError.message);
          syncResults.companies.push({
            name: companyName,
            status: 'research_failed',
            error: triggerError.message
          });
        }
      } else if (existingCompany.research_data) {
        syncResults.companies.push({
          name: companyName,
          status: 'already_has_research',
          companyId: existingCompany.id
        });
      } else {
        syncResults.companies.push({
          name: companyName,
          status: 'no_trigger_client'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${syncResults.synced} calendar events, queued ${syncResults.researched} research jobs${syncResults.deduplicated > 0 ? `, removed ${syncResults.deduplicated} duplicates` : ''}`,
      ...syncResults
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
// GMAIL INTERVIEW EMAIL INGESTION (READ-ONLY)
// ============================================

app.post('/api/gmail/sync', async (req, res) => {
  try {
    const googleGmail = require('./lib/google-gmail');

    const messages = await googleGmail.getInterviewEmails(60, 40);

    const results = {
      processed: messages.length,
      created: 0,
      updated: 0,
      skipped: 0,
      companies: [],
    };

    for (const email of messages) {
      const lead = googleGmail.parseEmailToLead(email, normalizeCompanyName);
      if (!lead || !lead.companyName) {
        results.skipped++;
        continue;
      }

      let existingCompany = await db.getCompany(lead.companyName);

      // Create if missing
      if (!existingCompany) {
        const note = lead.jobTitle
          ? `Job Title: ${lead.jobTitle}`
          : lead.subject
          ? `From email: ${lead.subject.substring(0, 180)}`
          : null;
        await db.addCompanyToPipeline(lead.companyName, 'screening', null, note);
        existingCompany = await db.getCompany(lead.companyName);
        results.created++;
      }

      // Update notes if we have a better job title and current notes look auto
      if (existingCompany && lead.jobTitle) {
        const notes = existingCompany.notes || '';
        const looksAuto = notes.startsWith('Auto-added from calendar') || notes.startsWith('Job Title:') || notes.startsWith('From email:');
        if (!notes || looksAuto || googleGmail.isLikelyTitle(notes) === false) {
          await db.query(
            `UPDATE companies SET notes = $1 WHERE id = $2`,
            [`Job Title: ${lead.jobTitle}`, existingCompany.id]
          );
          results.updated++;
        }
      }

      // Auto-trigger research if missing
      if (existingCompany && !existingCompany.research_data && triggerClient) {
        const jobId = uuidv4();
        try {
          await triggerClient.queueResearchJob({
            jobId,
            companyName: lead.companyName,
            companyUrl: null,
            role: lead.jobTitle || 'Interview Role',
            deepMode: true,
          });
          results.companies.push({ name: lead.companyName, status: 'research_queued', jobId });
        } catch (err) {
          console.warn(`Failed to queue research for ${lead.companyName}:`, err.message);
          results.companies.push({ name: lead.companyName, status: 'research_failed', error: err.message });
        }
      } else {
        results.companies.push({ name: lead.companyName, status: 'updated' });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.processed} emails: created ${results.created}, updated ${results.updated}, skipped ${results.skipped}`,
      ...results,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    res.status(500).json({
      error: 'Failed to sync Gmail',
      message: error.message,
      hint: 'Re-run Google connect to grant gmail.readonly scope if missing.',
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
// ANALYTICS & INSIGHTS (Feature #1)
// ============================================

app.get('/api/analytics/pipeline', async (req, res) => {
  try {
    const analytics = await db.getPipelineAnalytics();
    const upcomingInterviews = await db.getUpcomingInterviews(14);
    
    // Calculate conversion rates
    const stageMap = {};
    let totalCompanies = 0;
    for (const stage of analytics) {
      stageMap[stage.stage] = stage.count;
      totalCompanies += stage.count;
    }
    
    res.json({
      success: true,
      stages: analytics,
      upcomingInterviews,
      summary: {
        totalCompanies,
        screening: stageMap['screening'] || 0,
        technical: stageMap['technical'] || 0,
        final: stageMap['final'] || 0,
        offers: stageMap['offer'] || 0,
        conversionScreeningToTechnical: stageMap['technical'] && stageMap['screening'] 
          ? Math.round((stageMap['technical'] / stageMap['screening']) * 100)
          : 0,
        conversionTechnicalToFinal: stageMap['final'] && stageMap['technical']
          ? Math.round((stageMap['final'] / stageMap['technical']) * 100)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PREP CHECKLIST (Feature #4)
// ============================================

app.get('/api/pipeline/:id/checklist', async (req, res) => {
  try {
    const checklist = await db.getPrepChecklist(req.params.id);
    res.json({ success: true, checklist });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipeline/:id/checklist', async (req, res) => {
  try {
    const { items } = req.body;
    const addedItems = [];
    
    for (const item of items) {
      const result = await db.addPrepChecklistItem(req.params.id, item);
      addedItems.push(result);
    }
    
    res.json({ success: true, items: addedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/pipeline/checklist/:itemId/toggle', async (req, res) => {
  try {
    const { completed } = req.body;
    const updated = await db.toggleChecklistItem(req.params.itemId, completed);
    res.json({ success: true, item: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SALARY DATA (Feature #5)
// ============================================

app.get('/api/pipeline/:id/salary', async (req, res) => {
  try {
    const salary = await db.getSalaryData(req.params.id);
    res.json({ success: true, salary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipeline/:id/salary', async (req, res) => {
  try {
    const salaryData = req.body;
    const result = await db.addSalaryData(req.params.id, salaryData);
    res.json({ success: true, salary: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INTERVIEW FEEDBACK (Feature #8)
// ============================================

app.get('/api/pipeline/:id/feedback', async (req, res) => {
  try {
    const feedback = await db.getInterviewFeedback(req.params.id);
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipeline/:id/feedback', async (req, res) => {
  try {
    const feedback = req.body;
    const result = await db.addInterviewFeedback(req.params.id, feedback);
    res.json({ success: true, feedback: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SALARY CALCULATOR ENDPOINTS
// ============================================

app.get('/api/salary/calculate', (req, res) => {
  try {
    const { role, yoe, location, companySize } = req.query;

    const roleBaseRates = {
      'Technical Support Engineer': 110000,
      'Software Engineer': 140000,
      'Senior Software Engineer': 170000,
      'Product Support Engineer': 120000,
      'Developer Advocate': 150000,
      'Staff Engineer': 190000,
      'Engineering Manager': 180000,
    };

    const experienceMultipliers = {
      '0-2': 0.85, '2-4': 1.0, '4-6': 1.15,
      '6-8': 1.30, '8-10': 1.45, '10+': 1.60
    };

    const locationMultipliers = {
      'San Francisco': 1.0, 'New York': 1.05, 'Seattle': 0.95,
      'Nashville': 0.85, 'Remote': 0.90, 'Austin': 0.88,
      'Denver': 0.87, 'Boston': 0.98
    };

    const sizeMultipliers = {
      'Startup (<50)': 0.9, 'Growth (50-500)': 1.0, 'Enterprise (500+)': 1.1
    };

    const getExpRange = (years) => {
      if (years <= 2) return '0-2';
      if (years <= 4) return '2-4';
      if (years <= 6) return '4-6';
      if (years <= 8) return '6-8';
      if (years <= 10) return '8-10';
      return '10+';
    };

    const baseRate = roleBaseRates[role] || 140000;
    const expMult = experienceMultipliers[getExpRange(parseInt(yoe))];
    const locMult = locationMultipliers[location];
    const sizeMult = sizeMultipliers[companySize];

    const targetBase = Math.round(baseRate * expMult * locMult * sizeMult);

    const result = {
      conservative: {
        min: Math.round(targetBase * 0.85),
        max: Math.round(targetBase * 0.95)
      },
      target: {
        min: Math.round(targetBase * 1.0),
        max: Math.round(targetBase * 1.15)
      },
      stretch: {
        min: Math.round(targetBase * 1.15),
        max: Math.round(targetBase * 1.35)
      },
      equity: {
        min: Math.round(targetBase * 0.18),
        max: Math.round(targetBase * 0.35)
      },
      totalComp: {
        min: Math.round(targetBase * 1.18),
        max: Math.round(targetBase * 1.5)
      }
    };

    if (posthog) {
      posthog.capture({ distinctId: 'server', event: 'salary_calculated', properties: { role, yoe, location } });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/salary/save/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { targetMin, targetMax, calculatorInputs } = req.body;

    await db.query(
      `UPDATE companies
       SET salary_target_min = $1,
           salary_target_max = $2,
           salary_research_data = $3
       WHERE id = $4`,
      [targetMin, targetMax, JSON.stringify(calculatorInputs), companyId]
    );

    if (posthog) {
      posthog.capture({ distinctId: 'server', event: 'salary_target_saved', properties: { companyId, targetMin, targetMax } });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/salary/script/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { targetBase, userBackground, companyContext } = req.body;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Generate a professional salary negotiation script for a job offer.

User Background: ${userBackground}
Target Base Salary: $${targetBase}
Company Context: ${companyContext}

Generate a 3-4 sentence negotiation script that:
1. Highlights relevant experience and achievements
2. References market data (Levels.fyi, industry standards)
3. States the target salary range confidently
4. Emphasizes value the candidate will bring

Return ONLY the script text, no extra formatting.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const script = message.content[0].text;

    if (posthog) {
      posthog.capture({ distinctId: 'server', event: 'negotiation_script_generated', properties: { companyId, targetBase } });
    }

    res.json({ script });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

    // Auto-run migrations on startup
    console.log('🔄 Starting migration check...');
    try {
      const fs = require('fs');
      const path = require('path');

      const migrationsDir = path.join(__dirname, 'migrations');
      console.log(`📁 Migrations directory: ${migrationsDir}`);

      // Check if directory exists
      if (!fs.existsSync(migrationsDir)) {
        console.error(`❌ Migrations directory does not exist: ${migrationsDir}`);
      } else {
        console.log(`✅ Migrations directory exists`);

        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort();

        console.log(`📋 Found ${migrationFiles.length} migration files:`, migrationFiles);

        for (const file of migrationFiles) {
          console.log(`\n🔄 Running migration: ${file}`);
          try {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            console.log(`  📄 Read ${sql.length} characters from ${file}`);

            await db.query(sql);
            console.log(`  ✅ ${file} - SUCCESS`);
          } catch (migError) {
            // Migration might already be applied - that's OK
            if (migError.code === '42701' || migError.code === '42P07' || migError.code === '42P16') {
              console.log(`  ⏭️  ${file} - ALREADY APPLIED (${migError.code})`);
            } else {
              console.log(`  ⚠️  ${file} - ERROR: ${migError.code} - ${migError.message}`);
            }
          }
        }

        console.log('\n✅ Migrations complete');
      }
    } catch (error) {
      console.error('❌ Migration check failed with error:', error);
      console.error('Stack:', error.stack);
    }
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
