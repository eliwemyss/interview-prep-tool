const { TriggerClient } = require('@trigger.dev/sdk');
const db = require('../lib/database');

// Initialize Trigger.dev client
const client = new TriggerClient({
  id: 'interview-prep-tool',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL || 'https://api.trigger.dev'
});

/**
 * Batch Research Job
 * Triggers multiple individual research jobs in parallel
 */
client.defineJob({
  id: 'research-batch',
  name: 'Batch Research',
  version: '1.0.0',
  trigger: {
    name: 'research.batch'
  },
  run: async (payload, io, ctx) => {
    const { companies, batchId } = payload;
    
    await io.logger.info(`Starting batch research for ${companies.length} companies`, {
      batchId,
      companies
    });
    
    try {
      // Create batch record in database
      await io.logger.info('Creating batch record...');
      await db.createBatch(batchId, companies);
      
      await io.logger.info('Triggering individual research jobs...');
      
      // Trigger individual research jobs in parallel
      const jobs = await Promise.all(
        companies.map(async (company, index) => {
          await io.logger.info(`Triggering job ${index + 1}/${companies.length}: ${company}`);
          
          return io.sendEvent({
            name: 'research.company',
            payload: { 
              companyName: company,
              batchId 
            }
          });
        })
      );
      
      await io.logger.info('All jobs triggered successfully', {
        totalJobs: jobs.length,
        batchId
      });
      
      return { 
        success: true,
        batchId, 
        totalJobs: jobs.length,
        status: 'processing',
        message: `Triggered ${jobs.length} research jobs`
      };
      
    } catch (error) {
      await io.logger.error('Batch job failed', {
        batchId,
        error: error.message
      });
      
      throw error;
    }
  }
});

module.exports = client;
