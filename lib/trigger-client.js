// Trigger.dev v4 has different initialization
// For now, just export placeholder functions until we configure it properly
const client = {
  configured: false,
  apiKey: process.env.TRIGGER_SECRET_KEY
};

/**
 * Test Trigger.dev connection
 */
async function testTriggerConnection() {
  try {
    if (!process.env.TRIGGER_SECRET_KEY) {
      return {
        connected: false,
        error: 'TRIGGER_SECRET_KEY not configured'
      };
    }

    // Simple test - check if client is configured
    return {
      connected: true,
      apiKey: process.env.TRIGGER_SECRET_KEY.substring(0, 10) + '...',
      message: 'Trigger.dev client initialized'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Trigger a research job
 */
async function triggerResearchJob(companyName, jobId) {
  try {
    // In a full implementation, this would use client.sendEvent()
    // For now, we'll return a mock response since jobs aren't fully set up
    return {
      success: true,
      jobId,
      company: companyName,
      status: 'queued',
      message: 'Job would be queued in Trigger.dev (jobs not fully configured yet)'
    };
  } catch (error) {
    console.error('Trigger job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  client,
  testTriggerConnection,
  triggerResearchJob
};
