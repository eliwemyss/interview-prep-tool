const { google } = require('googleapis');
require('dotenv').config();

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://interviews.himynameiseli.com/api/calendar/callback'
);

// Scopes for calendar access - read and write
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

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
 * Extract company name from organizer email
 * e.g., "john@stripe.com" -> "Stripe"
 */
function extractCompanyFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.split('@')[1];
  if (!domain) return null;
  
  // Remove common TLDs and subdomains
  let company = domain
    .replace(/\.(com|co|io|org|net|dev|app|tech|ai|uk|de|fr)$/i, '')
    .replace(/^(mail\.|info\.|noreply\.|hello\.|team\.)/, '')
    .split('.')[0];
  
  // Known domain to company mappings
  const domainMap = {
    'stripe': 'Stripe',
    'airbnb': 'Airbnb',
    'uber': 'Uber',
    'google': 'Google',
    'gmail': 'Gmail',
    'amazon': 'Amazon',
    'microsoft': 'Microsoft',
    'apple': 'Apple',
    'meta': 'Meta',
    'netflix': 'Netflix',
    'spotify': 'Spotify',
    'github': 'GitHub',
    'gitlab': 'GitLab',
    'linear': 'Linear',
    'railway': 'Railway',
    'vercel': 'Vercel',
    'netlify': 'Netlify',
    'heroku': 'Heroku',
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'trigger': 'Trigger.dev',
    'junction': 'Junction',
    'storyblok': 'Storyblok'
  };
  
  const normalized = company.toLowerCase();
  if (domainMap[normalized]) {
    return domainMap[normalized];
  }
  
  // Capitalize first letter if no mapping found
  if (company.length > 1) {
    return company.charAt(0).toUpperCase() + company.slice(1);
  }
  
  return null;
}

/**
 * Normalize company name to prevent duplicates
 */
function normalizeCompanyName(name) {
  if (!name) return name;
  
  // Canonical company name mappings
  const canonicalNames = {
    'storyblok': 'Storyblok',
    'gmail': 'Gmail',
    'trigger.dev': 'Trigger.dev',
    'trigger': 'Trigger.dev',
    'junction': 'Junction'
  };
  
  const normalized = name.toLowerCase().trim();
  return canonicalNames[normalized] || name;
}

/**
 * Extract company name from event title
 */
function extractCompanyName(eventTitle, organizerEmail = null) {
  if (!eventTitle) return null;
  
  // First try to extract from organizer email if available
  if (organizerEmail) {
    const emailCompany = extractCompanyFromEmail(organizerEmail);
    if (emailCompany) {
      return normalizeCompanyName(emailCompany);
    }
  }
  
  // More explicit patterns - order matters (most specific first)
  const patterns = [
    // "Screening interview between Trigger.dev and Eli Wemyss"
    /(?:interview|screening|call|chat)\s+(?:between|with)\s+([^\s]+(?:\.[^\s]+)?)\s+and/i,
    // "Your initial call with Junction"
    /(?:call|meeting|interview)\s+with\s+([A-Z][a-zA-Z0-9.]+)/,
    // "Trigger.dev - Technical Interview"
    /^([A-Z][a-zA-Z0-9.]+)\s*[-:|]\s*(?:interview|screening|technical|round)/i,
    // "Interview: Acme Corp"
    /interview:\s*([A-Z][a-zA-Z0-9.\s]+?)(?:\s*[-|]|$)/i,
    // "Technical Screen at Railway"
    /(?:screen|interview|round)\s+(?:at|with)\s+([A-Z][a-zA-Z0-9.]+)/i,
    // "Stripe Interview"
    /^([A-Z][a-zA-Z0-9.]+)\s+(?:interview|screening|call)/i,
  ];
  
  for (const pattern of patterns) {
    const match = eventTitle.match(pattern);
    if (match && match[1]) {
      let companyName = match[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^(the|a|an)\s+/i, '') // Remove articles
        .replace(/\s+(inc|llc|corp|ltd)\.?$/i, ''); // Remove corporate suffixes
      
      // Filter out common words that aren't company names
      const commonWords = ['screening', 'phone', 'video', 'call', 'meeting', 'chat', 'technical', 'final', 'appointment', 'initial'];
      if (!commonWords.includes(companyName.toLowerCase()) && companyName.length > 1) {
        return normalizeCompanyName(companyName);
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
 * Extract job title from event description or title
 */
function extractJobTitle(eventTitle, description) {
  if (!eventTitle && !description) return null;
  
  const fullText = `${eventTitle} ${description || ''}`.toLowerCase();
  
  // Common job title patterns
  const titlePatterns = [
    // Explicit mentions: "for Software Engineer role"
    /(?:for|position|role):\s*([A-Za-z\s]+?)(?:\s+(?:role|position|interview|at|with)|\s*$)/i,
    // "Software Engineer - Technical Interview"
    /^([A-Za-z\s]+?)\s*[-:|]\s*(?:interview|screening|technical|round)/i,
    // "Interview: Software Engineer at Company"
    /interview:\s*([A-Za-z\s]+?)\s+(?:at|with|interview|role|position)/i,
    // Extract from description if it mentions specific titles
    /(?:applying for|position|role|title):\s*([A-Za-z\s]+?)(?:\s*[-|]|\n|$)/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = eventTitle?.match(pattern) || description?.match(pattern);
    if (match && match[1]) {
      let title = match[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s+(?:interview|screening|technical|round|at|with).*$/i, '');
      
      // Filter out common non-titles
      const nonTitles = ['screening', 'phone', 'video', 'call', 'meeting', 'interview', 'technical'];
      if (!nonTitles.includes(title.toLowerCase()) && title.length > 2) {
        return title;
      }
    }
  }
  
  // Fallback: try to extract a reasonable job title from common patterns
  if (fullText.includes('engineer')) {
    if (fullText.includes('senior')) return 'Senior Engineer';
    if (fullText.includes('staff')) return 'Staff Engineer';
    if (fullText.includes('frontend')) return 'Frontend Engineer';
    if (fullText.includes('backend')) return 'Backend Engineer';
    if (fullText.includes('full stack')) return 'Full Stack Engineer';
    return 'Software Engineer';
  }
  
  if (fullText.includes('manager')) {
    if (fullText.includes('product')) return 'Product Manager';
    if (fullText.includes('engineering')) return 'Engineering Manager';
    return 'Manager';
  }
  
  if (fullText.includes('designer')) {
    if (fullText.includes('product')) return 'Product Designer';
    return 'Designer';
  }
  
  return null;
}

/**
 * Get interview events (past 2 weeks + upcoming)
 */
async function getInterviewEvents(daysAhead = 14, daysBack = 14) {
  try {
    const events = await getUpcomingEvents(daysAhead);
    const pastEvents = await getPastEvents(daysBack);
    
    // Combine and remove duplicates
    const allEvents = [...pastEvents, ...events];
    const uniqueEvents = [];
    const seenIds = new Set();
    
    for (const event of allEvents) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        if (isInterviewEvent(event)) {
          const organizerEmail = event.organizer?.email;
          const jobTitle = extractJobTitle(event.summary, event.description);
          uniqueEvents.push({
            id: event.id,
            summary: event.summary,
            description: event.description,
            startTime: event.start.dateTime || event.start.date,
            endTime: event.end.dateTime || event.end.date,
            location: event.location,
            organizerEmail: organizerEmail,
            companyName: extractCompanyName(event.summary, organizerEmail),
            jobTitle: jobTitle
          });
        }
      }
    }
    
    return uniqueEvents;
  } catch (error) {
    console.error('Error getting interview events:', error);
    return [];
  }
}

/**
 * Get past calendar events
 */
async function getPastEvents(daysBack = 14) {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return [];
    }
    
    setCredentials(process.env.GOOGLE_REFRESH_TOKEN);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBack);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: pastDate.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching past calendar events:', error.message);
    return [];
  }
}

module.exports = {
  connectGoogleCalendar,
  getTokensFromCode,
  setCredentials,
  getUpcomingEvents,
  getPastEvents,
  getInterviewEvents,
  extractCompanyName,
  extractCompanyFromEmail,
  extractJobTitle,
  normalizeCompanyName,
  isInterviewEvent
};
