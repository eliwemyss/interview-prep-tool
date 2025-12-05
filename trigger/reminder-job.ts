import { schedules } from "@trigger.dev/sdk/v3";
import axios from "axios";

/**
 * Interview Reminder Cron Job
 * Runs daily at 9am to send email reminders for interviews in the next 24 hours
 */
export const interviewReminderSchedule = schedules.task({
  id: "interview-reminder-cron",
  // Run daily at 9:00 AM
  cron: "0 9 * * *",
  run: async (payload) => {
    const API_URL = process.env.API_URL || "http://localhost:3000";
    
    console.log("[Interview Reminders] Starting scheduled reminder check...");
    
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/interview-reminders`,
        {
          hoursAhead: 24,
          windowMinutes: 90
        },
        {
          timeout: 60000, // 1 minute timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const { sent, interviews } = response.data;
      
      console.log(`[Interview Reminders] ✅ Completed successfully`);
      console.log(`  - Emails sent: ${sent}`);
      console.log(`  - Interviews found: ${interviews?.length || 0}`);
      
      if (interviews && interviews.length > 0) {
        interviews.forEach((interview: any) => {
          console.log(`    • ${interview.company_name} - ${new Date(interview.start_time).toLocaleString()}`);
        });
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          emailsSent: sent,
          interviewsFound: interviews?.length || 0,
          interviews: interviews?.map((i: any) => ({
            company: i.company_name,
            time: i.start_time
          })) || []
        }
      };
    } catch (error: any) {
      console.error(`[Interview Reminders] ❌ Failed:`, error.message);
      
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
