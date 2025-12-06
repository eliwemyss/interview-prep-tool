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
    'storyblok': 'Storyblok',
    'posthog': 'PostHog',
    'xoi': 'XOi Technologies',
    'marchex': 'Marchex',
    'toast': 'Toast',
    'toasttab': 'Toast'
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
    'trigger.dev': 'Trigger.dev',
    'trigger': 'Trigger.dev',
    'junction': 'Junction',
    'xoi technologies': 'XOi Technologies',
    'xoi': 'XOi Technologies',
    'marchex': 'Marchex',
    'toast': 'Toast',
    'posthog': 'PostHog',  // Real interview, not dummy data
  };
  
  const normalized = name.toLowerCase().trim();
  return canonicalNames[normalized] || name;
}

/**
 * Extract company name from event title
 */
function extractCompanyName(eventTitle, organizerEmail = null) {
  if (!eventTitle) return null;
  
  // Try to extract from title FIRST (more reliable than email)
  // More explicit patterns - order matters (most specific first)
  const patterns = [
    // "Interview with XOi Technologies for L2 Support Engineer"
    /(?:interview|screening|call)\s+with\s+([A-Za-z0-9][A-Za-z0-9.\s]+?)\s+(?:for|[\|])/i,
    // "Interview with Storyblok" (simple with pattern, must end or have space)
    /(?:interview|screening|call)\s+with\s+([A-Za-z0-9][A-Za-z0-9.\s]+?)(?:\s*$)/i,
    // "Interview at Marchex"
    /(?:interview|screening|call)\s+at\s+([A-Za-z0-9][A-Za-z0-9.\s]+?)(?:\s*$)/i,
    // "Screening interview between Trigger.dev and Eli Wemyss"
    /(?:interview|screening|call|chat)\s+(?:between)\s+([^\s]+(?:\.[^\s]+)?)\s+and/i,
    // "Toast Phone Interview | Developer Advocate"
    /^([A-Za-z0-9][A-Za-z0-9.\s]+?)\s+(?:phone|video)?\s*(?:interview|screening|call)/i,
    // "Interview with PostHog | Culture Screen"
    /(?:interview|screening|call)\s+with\s+([A-Za-z0-9][A-Za-z0-9.\s]+?)\s*[\|]/i,
    // "Trigger.dev - Technical Interview"
    /^([A-Z][a-zA-Z0-9.]+)\s*[-:|]\s*(?:interview|screening|technical|round)/i,
    // "Interview: Acme Corp"
    /interview:\s*([A-Z][a-zA-Z0-9.\s]+?)(?:\s*[-|]|$)/i,
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
  
  // Fallback: try organizer email only if title extraction failed
  if (organizerEmail) {
    const emailCompany = extractCompanyFromEmail(organizerEmail);
    if (emailCompany && emailCompany !== 'Gmail') {  // Ignore generic gmail
      return normalizeCompanyName(emailCompany);
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
function isLikelyTitle(title) {
  if (!title) return false;
  const lower = title.toLowerCase();
  const keywords = [
    'engineer', 'developer', 'advocate', 'manager', 'designer', 'analyst',
    'support', 'success', 'sales', 'product', 'data', 'devops', 'security'
  ];
  return keywords.some(k => lower.includes(k));
}

function extractJobTitle(eventTitle, description) {
  if (!eventTitle && !description) return null;
  
  const fullText = `${eventTitle} ${description || ''}`;
  
  // Common job title patterns - order matters (most specific first)
  const titlePatterns = [
    // "Interview with XOi Technologies for L2 Support Engineer"
    /(?:for|position|role)\s+([A-Z][A-Za-z0-9\s]+?Engineer)/i,
    // "Toast Phone Interview | Developer Advocate"
    /[\|]\s*([A-Z][A-Za-z0-9\s]+?)(?:\s*$|\s*\[)/i,
    // "[Technical Support Engineer ]"
    /\[\s*([A-Z][A-Za-z0-9\s]+?)\s*\]/i,
    // "for Software Engineer role"
    /(?:for|position|role):\s*([A-Z][A-Za-z0-9\s]+?)(?:\s+(?:role|position|interview|at|with)|\s*$)/i,
    // "Software Engineer - Technical Interview"
    /^([A-Z][A-Za-z\s]+?)\s*[-:]\s*(?:interview|screening|technical|round)/i,
    // "Interview: Software Engineer at Company"
    /interview:\s*([A-Z][A-Za-z\s]+?)\s+(?:at|with)/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      let title = match[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s+(?:interview|screening|technical|round|at|with|for).*$/i, '');
      
      // Filter out common non-titles
      const nonTitles = ['screening', 'phone', 'video', 'call', 'meeting', 'interview', 'technical', 'appointment', 'culture screen'];
      if (!nonTitles.includes(title.toLowerCase()) && title.length > 2 && isLikelyTitle(title)) {
        return title;
      }
    }
  }
  
  // Fallback: look for common role keywords
  const lowerText = fullText.toLowerCase();
  
  if (lowerText.includes('support engineer')) {
    if (lowerText.includes('technical')) return 'Technical Support Engineer';
    if (lowerText.includes('l2')) return 'L2 Support Engineer';
    if (lowerText.includes('senior')) return 'Senior Support Engineer';
    return 'Support Engineer';
  }
  
  if (lowerText.includes('developer advocate')) return 'Developer Advocate';
  if (lowerText.includes('dev advocate')) return 'Developer Advocate';
  
  if (lowerText.includes('engineer')) {
    if (lowerText.includes('senior')) return 'Senior Engineer';
    if (lowerText.includes('staff')) return 'Staff Engineer';
    if (lowerText.includes('frontend') || lowerText.includes('front end')) return 'Frontend Engineer';
    if (lowerText.includes('backend') || lowerText.includes('back end')) return 'Backend Engineer';
    if (lowerText.includes('full stack') || lowerText.includes('fullstack')) return 'Full Stack Engineer';
    if (lowerText.includes('software')) return 'Software Engineer';
    return 'Engineer';
  }
  
  if (lowerText.includes('manager')) {
    if (lowerText.includes('product')) return 'Product Manager';
    if (lowerText.includes('engineering')) return 'Engineering Manager';
    if (lowerText.includes('technical')) return 'Technical Manager';
    return 'Manager';
  }
  
  if (lowerText.includes('designer')) {
    if (lowerText.includes('product')) return 'Product Designer';
    if (lowerText.includes('ux')) return 'UX Designer';
    if (lowerText.includes('ui')) return 'UI Designer';
    return 'Designer';
  }
  
  if (lowerText.includes('developer')) {
    if (lowerText.includes('senior')) return 'Senior Developer';
    if (lowerText.includes('full stack')) return 'Full Stack Developer';
    return 'Developer';
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
