const { google } = require('googleapis');
require('dotenv').config();

// OAuth2 configuration (reuse calendar client settings)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://interviews.himynameiseli.com/api/calendar/callback'
);

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function setCredentials(refreshToken) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
}

function getGmailClient() {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing GOOGLE_REFRESH_TOKEN');
  }
  setCredentials(process.env.GOOGLE_REFRESH_TOKEN);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function flattenParts(parts = [], result = []) {
  for (const part of parts) {
    if (part.parts) flattenParts(part.parts, result);
    else result.push(part);
  }
  return result;
}

function decodeBase64(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload) {
  if (!payload) return '';
  const parts = flattenParts(payload.parts || [payload]);
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64(part.body.data);
    }
  }
  // Fallback to first available body
  if (parts[0]?.body?.data) return decodeBase64(parts[0].body.data);
  return '';
}

function extractHeader(headers, name) {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function isLikelyTitle(title) {
  if (!title) return false;
  const lower = title.toLowerCase();
  const keywords = [
    'engineer', 'developer', 'advocate', 'manager', 'designer', 'analyst',
    'support', 'success', 'sales', 'product', 'data', 'devops', 'security'
  ];
  return keywords.some((k) => lower.includes(k));
}

function extractJobTitleFromText(text) {
  if (!text) return null;
  const patterns = [
    /\b(senior|staff)?\s*technical support engineer\b/i,
    /\b(l2|level 2) support engineer\b/i,
    /\bdeveloper advocate\b/i,
    /\bsupport engineer\b/i,
    /\bproduct support engineer\b/i,
    /\btechnical account manager\b/i,
    /\b(customer|partner) success manager\b/i,
    /\b(senior|staff)?\s*(frontend|backend|full stack)?\s*engineer\b/i,
    /\bproduct manager\b/i,
    /\bengineering manager\b/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[0]) return m[0].trim().replace(/\s+/g, ' ');
  }

  // Generic catch-all after patterns
  const generic = text.match(/\b([A-Z][A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,4}\s+(Engineer|Developer|Manager|Designer|Analyst))\b/);
  if (generic && generic[1] && isLikelyTitle(generic[1])) return generic[1].trim();

  return null;
}

function extractCompanyFromText(text) {
  if (!text) return null;
  // Simple heuristic: look for capitalized words before 'role' or 'interview'
  const roleMatch = text.match(/(?:at|with)\s+([A-Z][A-Za-z0-9.\-]+(?:\s+[A-Z][A-Za-z0-9.\-]+)?)/);
  if (roleMatch && roleMatch[1]) return roleMatch[1].trim();
  return null;
}

async function getInterviewEmails(daysBack = 45, maxResults = 30) {
  const gmail = getGmailClient();
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const after = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;
  const q = `after:${after} (interview OR screening OR onsite OR "hiring manager" OR recruiter)`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults,
  });

  const messages = [];
  for (const m of listRes.data.messages || []) {
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const payload = full.data.payload;
    const headers = payload?.headers || [];
    const subject = extractHeader(headers, 'Subject');
    const from = extractHeader(headers, 'From');
    const snippet = full.data.snippet || '';
    const body = extractBody(payload);
    messages.push({ subject, from, snippet, body });
  }

  return messages;
}

function parseEmailToLead(email, normalizeCompanyName) {
  const subject = email.subject || '';
  const body = email.body || '';
  const text = `${subject}\n${email.snippet || ''}\n${body}`;

  const jobTitle = extractJobTitleFromText(text);
  const company = extractCompanyFromText(subject) || extractCompanyFromText(body);

  if (!company && !jobTitle) return null;
  const companyName = company ? normalizeCompanyName(company) : null;

  return {
    companyName,
    jobTitle,
    subject,
    snippet: email.snippet || '',
  };
}

module.exports = {
  GMAIL_SCOPES,
  getInterviewEmails,
  parseEmailToLead,
  isLikelyTitle,
};
