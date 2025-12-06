import { schedules } from "@trigger.dev/sdk/v3";
import axios from "axios";

/**
 * Calendar Sync Cron Job
 * Runs every 6 hours to sync Google Calendar and auto-research new companies
 */
export const calendarSyncSchedule = schedules.task({
  id: "calendar-sync-cron",
  // Run every 6 hours at :00 minutes
  cron: "0 */6 * * *",
  run: async (payload) => {
    const API_URL = process.env.API_URL || process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://interviews.himynameiseli.com";

    console.log(`[Calendar Sync] Starting scheduled sync at ${new Date().toISOString()}`);
    console.log(`[Calendar Sync] API URL: ${API_URL}`);

    try {
      const response = await axios.post(`${API_URL}/api/calendar/sync`, {}, {
        timeout: 120000, // 2 minute timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const { total, synced, researched, companies } = response.data;
      
      console.log(`[Calendar Sync] ✅ Completed successfully`);
      console.log(`  - Total events: ${total}`);
      console.log(`  - Synced events: ${synced}`);
      console.log(`  - Research jobs queued: ${researched}`);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          total,
          synced,
          researched,
          companies: companies.map((c: any) => ({
            name: c.name,
            status: c.status
          }))
        }
      };
    } catch (error: any) {
      console.error(`[Calendar Sync] ❌ Failed:`, error.message);
      
      // Don't throw - let the job complete and log the error
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: error.response?.data || null
      };
    }
  },
});
