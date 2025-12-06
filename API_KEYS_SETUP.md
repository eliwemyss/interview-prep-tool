# API Keys Setup Guide

## ✅ Already Configured (Based on Existing Project)

These should already be set in your Railway environment:

1. **ANTHROPIC_API_KEY** - Claude AI for research
   - Status: ✅ Already configured
   - Used for: Company research, interview prep, negotiation scripts

2. **DATABASE_URL** - PostgreSQL connection
   - Status: ✅ Automatically provided by Railway
   - No action needed

3. **GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET** - Gmail/Calendar access
   - Status: ✅ You mentioned this is configured
   - Used for: Gmail sync (extract job titles/interviewers), Calendar sync

4. **TRIGGER_API_KEY** - Background jobs
   - Status: ✅ Should be configured
   - Used for: Interview reminder emails, news scraping jobs

5. **SMTP Credentials** - Email sending
   - Status: ✅ Likely configured
   - Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO

---

## 🆕 NEW - Required for PostHog Features

### 1. PostHog Analytics (CRITICAL for tracking)

**Why you need it:** Track all user interactions, salary calculations, research events

**Sign up:** https://posthog.com (FREE tier available - 1M events/month)

**After signup, get your API keys from:** Project Settings → API Keys

**Add to Railway:**
```bash
railway variables set POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxx
railway variables set POSTHOG_HOST=https://app.posthog.com
railway variables set NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
railway variables set NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Events tracked:**
- dashboard_viewed
- company_modal_opened
- salary_calculated
- negotiation_script_generated
- gmail_synced
- calendar_synced
- research_completed
- And 10+ more...

---

## 🎯 OPTIONAL but Recommended

### 2. NewsAPI (for company news scraping)

**Why you need it:** Get recent news about companies, detect critical events (layoffs, funding)

**Sign up:** https://newsapi.org (FREE tier: 100 requests/day)

**Add to Railway:**
```bash
railway variables set NEWSAPI_KEY=xxxxxxxxxxxxxxxx
```

**What it does:**
- Fetches news from last 7 days for companies with upcoming interviews
- Claude analyzes sentiment (positive/negative/neutral)
- Alerts you to critical events
- Displays in Research tab of Company Modal

**Without it:** News tab will be empty (app still works)

---

### 3. Levels.fyi API (for real salary data)

**Status:** OPTIONAL - Currently using calculated estimates

**Why you'd want it:** Get real salary data instead of estimates

**Currently:** The salary calculator uses a formula-based approach (works great!)

**With API:** Would show actual reported salaries from Levels.fyi

**Note:** Levels.fyi doesn't have a public API - we're using estimates for now

---

## 🚀 Quick Setup Commands

### Step 1: Set up PostHog (REQUIRED)

1. Go to https://posthog.com and sign up
2. Create a new project
3. Go to Project Settings → API Keys
4. Copy your Project API Key (starts with `phc_`)
5. Run:

```bash
railway variables set POSTHOG_API_KEY=phc_YOUR_KEY_HERE
railway variables set POSTHOG_HOST=https://app.posthog.com
railway variables set NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
railway variables set NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 2: Set up NewsAPI (OPTIONAL)

1. Go to https://newsapi.org and sign up
2. Copy your API key
3. Run:

```bash
railway variables set NEWSAPI_KEY=YOUR_KEY_HERE
```

### Step 3: Set Frontend API URL

```bash
railway variables set NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

---

## 📋 Verification Checklist

After adding environment variables, verify in Railway dashboard:

### Backend Variables (interview-prep-tool service):
- [x] DATABASE_URL (auto-provided by Railway)
- [x] ANTHROPIC_API_KEY
- [x] GOOGLE_CLIENT_ID
- [x] GOOGLE_CLIENT_SECRET
- [x] GOOGLE_REDIRECT_URI
- [x] TRIGGER_API_KEY
- [x] SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- [x] EMAIL_FROM, EMAIL_TO
- [ ] POSTHOG_API_KEY (ADD THIS)
- [ ] POSTHOG_HOST (ADD THIS)
- [ ] NEWSAPI_KEY (OPTIONAL)

### Frontend Variables (if deploying frontend separately):
- [ ] NEXT_PUBLIC_API_URL
- [ ] NEXT_PUBLIC_POSTHOG_KEY
- [ ] NEXT_PUBLIC_POSTHOG_HOST

---

## 🎯 Current Deployment Status

**Backend:** Deployed to Railway
**Frontend:** Next.js app in `frontend/` directory

**Two deployment options:**

### Option 1: Backend + Frontend on Railway (Current)
- Backend serves API
- Frontend builds during deployment
- All in one service

### Option 2: Split Deployment (Recommended for production)
- Backend on Railway (API only)
- Frontend on Vercel (optimized for Next.js)
- Better performance and scaling

---

## 🆘 Troubleshooting

**PostHog events not showing up?**
- Check POSTHOG_API_KEY is set in both backend and NEXT_PUBLIC_POSTHOG_KEY for frontend
- Verify host is `https://app.posthog.com` (or your self-hosted URL)
- Check PostHog dashboard → Live Events tab

**News scraping not working?**
- Verify NEWSAPI_KEY is set
- Check you haven't exceeded free tier limit (100 requests/day)
- News is optional - app works without it

**Salary calculator not working?**
- This uses local calculations - no external API needed
- Check browser console for errors
- Verify backend endpoints are responding: GET /api/salary/calculate

---

## 📞 Support

If you need help:
1. Check Railway logs: `railway logs`
2. Check PostHog dashboard for tracked events
3. Verify all required env vars are set: `railway variables`

**Next Steps:**
1. Add PostHog keys (REQUIRED for analytics)
2. Add NewsAPI key (OPTIONAL for news)
3. Restart Railway service after adding variables
4. Test the app!
