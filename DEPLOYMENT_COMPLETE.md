# 🚀 Complete Deployment Guide

This guide covers deploying the Interview Prep Tool to production with all features enabled.

## Table of Contents
1. [Trigger.dev Setup](#triggerddev-setup)
2. [Railway Deployment](#railway-deployment)
3. [Google Calendar OAuth](#google-calendar-oauth)
4. [Email Configuration](#email-configuration)
5. [Testing & Verification](#testing--verification)

---

## 1. Trigger.dev Setup

### Step 1: Create Account
1. Go to https://trigger.dev
2. Sign up with GitHub
3. Create a new project: "interview-prep-tool"

### Step 2: Install CLI
```bash
cd /Users/eliwemyss/Desktop/Projects/interview-prep-tool/interview-prep-tool
npm install -g @trigger.dev/cli
```

### Step 3: Login & Initialize
```bash
# Login to Trigger.dev
npx trigger.dev login

# Initialize project (select existing project)
npx trigger.dev init

# Follow prompts:
# - Select project: "interview-prep-tool"
# - Framework: "Node.js/Express"
# - Location: "./trigger"
```

### Step 4: Deploy Tasks
```bash
# Deploy all Trigger.dev tasks to production
npx trigger.dev deploy

# This will deploy:
# ✅ scrapeWebsiteTask
# ✅ searchGitHubTask
# ✅ analyzeWithClaudeTask
# ✅ storeResearchTask
# ✅ companyResearchJob (orchestrator)
# ✅ calendarSyncSchedule (cron: every 6h)
# ✅ interviewReminderSchedule (cron: daily 9am)
# ✅ nightlyRefreshSchedule (cron: daily 2am)
```

### Step 5: Get API Keys
1. Go to https://trigger.dev/dashboard
2. Click on "interview-prep-tool"
3. Go to "Settings" → "API Keys"
4. Copy your production API key: `tr_prod_xxxxx`

---

## 2. Railway Deployment

### Step 1: Set Environment Variables

```bash
cd /Users/eliwemyss/Desktop/Projects/interview-prep-tool/interview-prep-tool

# Core Configuration
railway variables --set "PORT=3000"
railway variables --set "NODE_ENV=production"

# Database (Railway auto-sets this when you add PostgreSQL)
# DATABASE_URL is automatically set by Railway PostgreSQL plugin

# Anthropic API
railway variables --set "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE"

# Trigger.dev (use production key from Step 1.5)
railway variables --set "TRIGGER_API_KEY=tr_prod_xxxxx"
railway variables --set "TRIGGER_PROJECT_ID=interview-prep-tool"
railway variables --set "TRIGGER_API_URL=https://api.trigger.dev"

# Google Calendar (set after OAuth setup in Step 3)
railway variables --set "GOOGLE_CLIENT_ID=your_client_id"
railway variables --set "GOOGLE_CLIENT_SECRET=your_client_secret"
railway variables --set "GOOGLE_REDIRECT_URI=https://interviews.himynameiseli.com/api/calendar/callback"
railway variables --set "GOOGLE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_FROM_OAUTH_FLOW"

# Email (optional - set after configuring SMTP in Step 4)
railway variables --set "SMTP_HOST=smtp.gmail.com"
railway variables --set "SMTP_PORT=587"
railway variables --set "SMTP_USER=your_email@gmail.com"
railway variables --set "SMTP_PASS=your_app_password"
railway variables --set "EMAIL_TO=your_email@gmail.com"

# API URL for cron jobs (set to your Railway domain)
railway variables --set "API_URL=https://interviews.himynameiseli.com"
```

### Step 2: Deploy to Railway

```bash
# Push to Railway
railway up

# Or if using GitHub integration:
git add .
git commit -m "Production deployment with Trigger.dev automation"
git push origin main

# Railway will automatically deploy
```

### Step 3: Verify Deployment

```bash
# Check health
curl https://interviews.himynameiseli.com/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-12-05T...",
#   "database": "connected",
#   "env": {
#     "anthropicConfigured": true,
#     "triggerConfigured": true,
#     "googleCalendarConfigured": true
#   }
# }
```

---

## 3. Google Calendar OAuth

### Step 1: Create OAuth Credentials
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `https://interviews.himynameiseli.com/api/calendar/callback`
7. Copy Client ID and Client Secret

### Step 2: Set Railway Variables
```bash
railway variables --set "GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com"
railway variables --set "GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx"
railway variables --set "GOOGLE_REDIRECT_URI=https://interviews.himynameiseli.com/api/calendar/callback"
```

### Step 3: Complete OAuth Flow
1. Visit: https://interviews.himynameiseli.com/api/calendar/connect
2. Click "Authorize with Google"
3. Select your Google account
4. Grant calendar permissions
5. You'll be redirected to callback page showing your refresh token
6. Copy the refresh token

### Step 4: Set Refresh Token
```bash
railway variables --set "GOOGLE_REFRESH_TOKEN=1//05xxxxx"

# Redeploy to activate
railway up
```

### Step 5: Test Calendar Sync
```bash
# Manually trigger sync
curl -X POST https://interviews.himynameiseli.com/api/calendar/sync

# Expected response:
# {
#   "success": true,
#   "message": "Synced 7 calendar events, queued 2 research jobs",
#   "total": 7,
#   "synced": 7,
#   "researched": 2,
#   "companies": [...]
# }

# View events
curl https://interviews.himynameiseli.com/api/calendar/events
```

---

## 4. Email Configuration

### Step 1: Gmail App Password (Recommended)
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already enabled)
3. Go to "App passwords"
4. Generate new app password for "Mail"
5. Copy the 16-character password

### Step 2: Set Railway Variables
```bash
railway variables --set "SMTP_HOST=smtp.gmail.com"
railway variables --set "SMTP_PORT=587"
railway variables --set "SMTP_USER=your_email@gmail.com"
railway variables --set "SMTP_PASS=abcd efgh ijkl mnop"  # App password
railway variables --set "EMAIL_TO=your_email@gmail.com"

# Redeploy
railway up
```

### Step 3: Test Email Reminders
```bash
# Manually trigger reminder check
curl -X POST https://interviews.himynameiseli.com/api/notifications/interview-reminders \
  -H "Content-Type: application/json" \
  -d '{"hoursAhead": 24, "windowMinutes": 90}'

# Expected response:
# {
#   "success": true,
#   "sent": 1,
#   "interviews": [
#     {
#       "company_name": "Trigger.dev",
#       "start_time": "2025-12-06T10:00:00Z",
#       "prep_sent": true
#     }
#   ]
# }
```

---

## 5. Testing & Verification

### Backend Tests

```bash
# Health check
curl https://interviews.himynameiseli.com/health

# Queue research job
curl -X POST https://interviews.himynameiseli.com/api/research-direct \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Stripe",
    "role": "Backend Engineer",
    "deepMode": true
  }'

# Copy jobId from response, then poll status
curl https://interviews.himynameiseli.com/api/research-status/YOUR_JOB_ID

# Get pipeline companies
curl https://interviews.himynameiseli.com/api/pipeline

# Calendar sync (auto-research)
curl -X POST https://interviews.himynameiseli.com/api/calendar/sync

# Calendar events (interview filter)
curl https://interviews.himynameiseli.com/api/calendar/events
```

### Frontend Tests

#### Vanilla HTML (public/)
1. Visit: https://interviews.himynameiseli.com
2. Test research form (should show polling progress)
3. Visit: https://interviews.himynameiseli.com/dashboard.html
4. Test pipeline CRUD operations
5. Check calendar section shows interview events only

#### Next.js (frontend/)
```bash
cd /Users/eliwemyss/Desktop/Projects/interview-prep-tool/frontend

# Set API URL
echo "NEXT_PUBLIC_API_URL=https://interviews.himynameiseli.com" > .env.local

# Run dev server
npm run dev

# Open http://localhost:3000
# Test:
# 1. Research form with async polling
# 2. Progress messages during research
# 3. Results display
# 4. Dashboard pipeline management
```

### Trigger.dev Verification

1. Go to https://trigger.dev/dashboard
2. Select "interview-prep-tool"
3. Go to "Runs" tab
4. Verify you see:
   - Research job runs (from manual tests)
   - Scheduled runs (calendar sync, reminders, refresh)
5. Check logs for any errors

### Cron Job Verification

```bash
# Calendar sync should run every 6 hours
# Next run times: 12am, 6am, 12pm, 6pm

# Email reminders should run daily at 9am

# Nightly refresh should run daily at 2am

# Check Trigger.dev dashboard → Schedules to verify cron jobs are active
```

---

## 🎯 Production Checklist

- [ ] Trigger.dev tasks deployed (8 total)
- [ ] Railway environment variables set (14+ vars)
- [ ] Database tables created (4 tables)
- [ ] Google Calendar OAuth completed (refresh token set)
- [ ] SMTP email configured (app password set)
- [ ] Health check returns "healthy"
- [ ] Manual research job completes successfully
- [ ] Calendar sync triggers auto-research
- [ ] Calendar events filtered to interviews only
- [ ] Email reminders send successfully
- [ ] Frontend polling shows progress messages
- [ ] Trigger.dev dashboard shows runs
- [ ] Cron jobs scheduled and active

---

## 🔧 Troubleshooting

### "TRIGGER_API_KEY is not set"
- Check Railway variables: `railway variables`
- Verify API key is production key (starts with `tr_prod_`)
- Redeploy after setting: `railway up`

### "Calendar sync failed"
- Verify refresh token is valid
- Check Google Calendar API is enabled
- Test OAuth flow again: visit `/api/calendar/connect`

### "Email sending failed"
- Check app password (not regular password)
- Verify 2FA is enabled on Gmail
- Test SMTP connection manually

### "Jobs stuck in 'queued' status"
- Check Trigger.dev dashboard for errors
- Verify tasks are deployed: `npx trigger.dev list`
- Check DATABASE_URL is set correctly

### "TypeScript compilation errors"
- Run `npm install` to ensure all deps installed
- Check `@types/pg` is installed
- Verify `tsconfig.json` exists in project root

---

## 📊 Monitoring

### Key Metrics to Track
1. **Job Success Rate**: Trigger.dev dashboard → Runs → Success %
2. **API Response Times**: Railway logs
3. **Database Connections**: Railway PostgreSQL metrics
4. **Calendar Sync Stats**: Check `/api/calendar/events` count
5. **Email Delivery Rate**: SMTP logs in Railway

### Logs
```bash
# View Railway logs
railway logs

# Filter for errors
railway logs | grep ERROR

# Follow live logs
railway logs --follow
```

---

## 🎉 Success!

Your Interview Prep Tool is now fully deployed with:
- ✅ Async job processing (Trigger.dev v3)
- ✅ Auto calendar sync (every 6 hours)
- ✅ Email reminders (daily 9am)
- ✅ Nightly research refresh (daily 2am)
- ✅ Interview event filtering
- ✅ Real-time progress polling
- ✅ Production database (Railway PostgreSQL)
- ✅ AI-powered research (Claude 3 Haiku)

**Production URL**: https://interviews.himynameiseli.com

**Admin Links**:
- Trigger.dev Dashboard: https://trigger.dev/dashboard
- Railway Dashboard: https://railway.app/dashboard
- Google Cloud Console: https://console.cloud.google.com

**Next Steps**:
1. Add first company and test full workflow
2. Schedule a test interview in Google Calendar
3. Wait for auto-sync to detect it (max 6 hours)
4. Verify email reminder arrives 24h before
5. Check briefing page for interview prep

Enjoy your showcase-worthy interview prep platform! 🚀
