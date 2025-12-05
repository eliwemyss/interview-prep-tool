const { TriggerClient } = require('@trigger.dev/sdk');
const { performResearch } = require('../lib/research');
const db = require('../lib/database');

// Initialize Trigger.dev client
const client = new TriggerClient({
  id: 'interview-prep-tool',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL || 'https://api.trigger.dev'
});

/**
 * Single Company Research Job
 * Triggered by: Manual request or batch job
 */
client.defineJob({
  id: 'research-company',
  name: 'Research Company',
  version: '1.0.0',
  trigger: {
    name: 'research.company'
  },
  run: async (payload, io, ctx) => {
    const { companyName, isRefresh, batchId } = payload;
    
    await io.logger.info(`Starting research for ${companyName}`, {
      isRefresh,
      batchId
    });
    
    try {
      // Perform research
      await io.logger.info('Scraping website and GitHub...');
      const results = await performResearch(companyName);
      
      await io.logger.info('Research completed, saving to database...');
      
      // Save to database
      await db.upsertCompanyResearch(companyName, results);
      
      await io.logger.info('Saved to database successfully');
      
      // If part of batch, update batch status
      if (batchId) {
        await io.logger.info(`Updating batch ${batchId} progress...`);
        await db.updateBatchProgress(batchId, companyName, results);
      }
      
      await io.logger.info('Research job completed successfully', {
        company: companyName,
        productsFound: results.products?.length || 0,
        techStackItems: results.techStack?.length || 0
      });
      
      return {
        success: true,
        company: companyName,
        data: results
      };
      
    } catch (error) {
      await io.logger.error('Research job failed', {
        company: companyName,
        error: error.message
      });
      
      // Still update batch if applicable
      if (batchId) {
        await db.updateBatchProgress(batchId, companyName, {
          error: error.message
        });
      }
      
      throw error;
    }
  }
});

module.exports = client;
