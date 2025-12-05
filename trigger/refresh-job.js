const { TriggerClient } = require('@trigger.dev/sdk');
const db = require('../lib/database');

// Initialize Trigger.dev client
const client = new TriggerClient({
  id: 'interview-prep-tool',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL || 'https://api.trigger.dev'
});

/**
 * Nightly Refresh Job
 * Runs daily at 2am to refresh research for all active companies
 */
client.defineJob({
  id: 'nightly-refresh',
  name: 'Nightly Company Refresh',
  version: '1.0.0',
  trigger: {
    schedule: {
      cron: "0 2 * * *" // 2am daily
    }
  },
  run: async (payload, io, ctx) => {
    await io.logger.info('Starting nightly refresh job');
    
    try {
      // Get all active companies
      const companies = await db.getActiveCompanies();
      
      await io.logger.info(`Found ${companies.length} active companies to refresh`, {
        companies: companies.map(c => c.name)
      });
      
      if (companies.length === 0) {
        await io.logger.info('No active companies to refresh');
        return {
          success: true,
          refreshed: 0,
          message: 'No active companies'
        };
      }
      
      // Trigger research for each company
      const jobs = [];
      for (const company of companies) {
        await io.logger.info(`Triggering refresh for ${company.name}`);
        
        const job = await io.sendEvent({
          name: 'research.company',
          payload: { 
            companyName: company.name,
            isRefresh: true 
          }
        });
        
        jobs.push(job);
      }
      
      await io.logger.info('Nightly refresh completed', {
        companiesRefreshed: companies.length,
        jobsTriggered: jobs.length
      });
      
      return { 
        success: true,
        refreshed: companies.length,
        companies: companies.map(c => c.name)
      };
      
    } catch (error) {
      await io.logger.error('Nightly refresh failed', {
        error: error.message
      });
      
      throw error;
    }
  }
});

module.exports = client;
