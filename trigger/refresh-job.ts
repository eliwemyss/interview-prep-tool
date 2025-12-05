import { schedules } from "@trigger.dev/sdk/v3";
import { Pool } from "pg";
import { triggerClient } from "../lib/trigger-client";
import { v4 as uuidv4 } from "uuid";

/**
 * Nightly Research Refresh Cron Job
 * Runs daily at 2am to refresh research for companies with interviews in next 14 days
 */
export const nightlyRefreshSchedule = schedules.task({
  id: "nightly-refresh-cron",
  // Run daily at 2:00 AM
  cron: "0 2 * * *",
  run: async (payload) => {
    console.log("[Nightly Refresh] Starting scheduled research refresh...");
    
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    try {
      // Get companies with interviews in next 14 days that haven't been researched in last 7 days
      const query = `
        SELECT DISTINCT c.id, c.name, c.last_researched
        FROM companies c
        LEFT JOIN calendar_events ce ON ce.company_id = c.id
        WHERE ce.start_time BETWEEN NOW() AND NOW() + INTERVAL '14 days'
          AND (c.last_researched IS NULL OR c.last_researched < NOW() - INTERVAL '7 days')
        ORDER BY ce.start_time ASC
        LIMIT 10
      `;
      
      const result = await pool.query(query);
      const companies = result.rows;
      
      console.log(`[Nightly Refresh] Found ${companies.length} companies needing refresh`);
      
      if (companies.length === 0) {
        await pool.end();
        return {
          success: true,
          timestamp: new Date().toISOString(),
          stats: {
            companiesFound: 0,
            jobsQueued: 0
          }
        };
      }
      
      const queuedJobs = [];
      
      // Queue research jobs for each company
      for (const company of companies) {
        const jobId = uuidv4();
        
        try {
          if (triggerClient) {
            await triggerClient.queueResearchJob({
              jobId,
              companyName: company.name,
              companyUrl: null,
              role: 'Software Engineer', // Default role
              deepMode: true
            });
            
            console.log(`  ✅ Queued research for: ${company.name} (jobId: ${jobId})`);
            queuedJobs.push({
              company: company.name,
              jobId,
              status: 'queued'
            });
          } else {
            console.warn(`  ⚠️  Trigger client not available, skipping: ${company.name}`);
            queuedJobs.push({
              company: company.name,
              status: 'skipped',
              reason: 'Trigger client unavailable'
            });
          }
        } catch (error: any) {
          console.error(`  ❌ Failed to queue ${company.name}:`, error.message);
          queuedJobs.push({
            company: company.name,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      await pool.end();
      
      console.log(`[Nightly Refresh] ✅ Completed successfully`);
      console.log(`  - Companies processed: ${companies.length}`);
      console.log(`  - Jobs queued: ${queuedJobs.filter(j => j.status === 'queued').length}`);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          companiesFound: companies.length,
          jobsQueued: queuedJobs.filter(j => j.status === 'queued').length,
          jobs: queuedJobs
        }
      };
    } catch (error: any) {
      console.error(`[Nightly Refresh] ❌ Failed:`, error.message);
      
      await pool.end();
      
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  },
});
