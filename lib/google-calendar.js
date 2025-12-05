const { google } = require('googleapis');
require('dotenv').config();

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback'
);

// Scopes for calendar access
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Generate OAuth URL for user authorization
 */
function connectGoogleCalendar() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store refresh token securely (in production, save to database)
    if (tokens.refresh_token) {
      console.log('Refresh token received. Store this securely:', tokens.refresh_token);
    }
    
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Set credentials from stored refresh token
 */
function setCredentials(refreshToken) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
}

/**
 * Get upcoming calendar events
 */
async function getUpcomingEvents(daysAhead = 14) {
  try {
    // Check if we have credentials
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      console.log('No Google Calendar credentials configured');
      return [];
    }
    
    setCredentials(process.env.GOOGLE_REFRESH_TOKEN);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    return [];
  }
}

/**
 * Extract company name from event title
 */
function extractCompanyName(eventTitle) {
  if (!eventTitle) return null;
  
  // Common patterns for interview event titles
  const patterns = [
    /interview with ([^-|\n]+)/i,
    /([^\s|]+) interview/i,
    /interview at ([^-|\n]+)/i,
    /round (?:at|with) ([^-|\n]+)/i,
    /([^|]+)\s*\|\s*.*interview/i,
    /([^-]+)\s*-\s*interview/i,
    /interview:\s*([^-|\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = eventTitle.match(pattern);
    if (match && match[1]) {
      const companyName = match[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^(the|a|an)\s+/i, '') // Remove articles
        .replace(/\s+(inc|llc|corp|ltd)\.?$/i, ''); // Remove corporate suffixes
      
      // Filter out common words that aren't company names
      const commonWords = ['phone', 'video', 'call', 'meeting', 'chat', 'screen', 'technical', 'final'];
      if (!commonWords.includes(companyName.toLowerCase())) {
        return companyName;
      }
    }
  }
  
  return null;
}

/**
 * Check if event is an interview
 */
function isInterviewEvent(event) {
  if (!event.summary) return false;
  
  const title = event.summary.toLowerCase();
  const description = (event.description || '').toLowerCase();
  
  const interviewKeywords = [
    'interview',
    'screening',
    'technical screen',
    'culture fit',
    'hiring manager',
    'phone screen',
    'video interview',
    'coding challenge',
    'system design',
    'behavioral interview'
  ];
  
  return interviewKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
}

/**
 * Get interview events from calendar
 */
async function getInterviewEvents(daysAhead = 14) {
  try {
    const events = await getUpcomingEvents(daysAhead);
    
    return events.filter(isInterviewEvent).map(event => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      location: event.location,
      companyName: extractCompanyName(event.summary)
    }));
  } catch (error) {
    console.error('Error getting interview events:', error);
    return [];
  }
}

module.exports = {
  connectGoogleCalendar,
  getTokensFromCode,
  setCredentials,
  getUpcomingEvents,
  getInterviewEvents,
  extractCompanyName,
  isInterviewEvent
};
