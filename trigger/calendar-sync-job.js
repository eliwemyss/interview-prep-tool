const { TriggerClient } = require('@trigger.dev/sdk');
const db = require('../lib/database');
const { getUpcomingEvents, extractCompanyName } = require('../lib/google-calendar');
const { sendPrepEmail } = require('../lib/email');

// Initialize Trigger.dev client
const client = new TriggerClient({
  id: 'interview-prep-tool',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL || 'https://api.trigger.dev'
});

/**
 * Calendar Sync Job
 * Runs every 6 hours to check for upcoming interviews
 */
client.defineJob({
  id: 'calendar-sync',
  name: 'Calendar Sync',
  version: '1.0.0',
  trigger: {
    schedule: {
      cron: "0 */6 * * *" // Every 6 hours
    }
  },
  run: async (payload, io, ctx) => {
    await io.logger.info('Starting calendar sync job');
    
    try {
      // Get upcoming calendar events (next 14 days)
      await io.logger.info('Fetching calendar events...');
      const events = await getUpcomingEvents(14);
      
      await io.logger.info(`Found ${events.length} calendar events`);
      
      // Filter for interview events
      const interviewEvents = events.filter(e => 
        e.summary && e.summary.toLowerCase().includes('interview')
      );
      
      await io.logger.info(`Found ${interviewEvents.length} interview events`, {
        events: interviewEvents.map(e => e.summary)
      });
      
      let newCompanies = 0;
      let emailsSent = 0;
      
      for (const event of interviewEvents) {
        const companyName = extractCompanyName(event.summary);
        
        if (!companyName) {
          await io.logger.warn('Could not extract company name from event', {
            summary: event.summary
          });
          continue;
        }
        
        await io.logger.info(`Processing event for ${companyName}`, {
          eventId: event.id,
          date: event.start.dateTime
        });
        
        // Check if company exists in database
        let company = await db.getCompany(companyName);
        
        if (!company) {
          await io.logger.info(`New company detected: ${companyName}, triggering research`);
          
          // Trigger research for new company
          await io.sendEvent({
            name: 'research.company',
            payload: { companyName }
          });
          
          newCompanies++;
          
          // Add to pipeline
          company = await db.addCompanyToPipeline(
            companyName,
            'screening',
            event.start.dateTime,
            `Auto-detected from calendar event: ${event.summary}`
          );
        }
        
        // Save calendar event
        await db.addCalendarEvent(
          event.id,
          company.id,
          event.summary,
          event.start.dateTime
        );
        
        // Check if prep email needed (24 hours before)
        const eventDate = new Date(event.start.dateTime);
        const now = new Date();
        const hoursUntil = (eventDate - now) / (1000 * 60 * 60);
        
        if (hoursUntil <= 24 && hoursUntil > 23) {
          const alreadySent = await db.checkPrepEmailStatus(event.id);
          
          if (!alreadySent) {
            await io.logger.info(`Sending prep email for ${companyName}`, {
              eventDate: event.start.dateTime,
              hoursUntil
            });
            
            try {
              await sendPrepEmail(companyName, event, company.research_data);
              await db.markPrepEmailSent(event.id);
              emailsSent++;
              
              await io.logger.info(`Prep email sent for ${companyName}`);
            } catch (emailError) {
              await io.logger.error('Failed to send prep email', {
                company: companyName,
                error: emailError.message
              });
            }
          }
        }
      }
      
      await io.logger.info('Calendar sync completed', {
        totalEvents: events.length,
        interviewEvents: interviewEvents.length,
        newCompanies,
        emailsSent
      });
      
      return { 
        success: true,
        processed: interviewEvents.length,
        newCompanies,
        emailsSent
      };
      
    } catch (error) {
      await io.logger.error('Calendar sync failed', {
        error: error.message
      });
      
      // Don't throw - we want the job to continue running
      return {
        success: false,
        error: error.message
      };
    }
  }
});

module.exports = client;
