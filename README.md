# 🎯 Interview Prep Tool

> AI-powered interview preparation with automated company research and calendar integration

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Automatically research companies, track your interview pipeline, and get AI-generated prep materials delivered right before your interviews. Built with Claude AI, PostgreSQL, and Trigger.dev.

## ✨ Features

### 🔍 Intelligent Company Research
- **Single Company Research**: Get comprehensive interview prep in 30 seconds
- **Batch Processing**: Research multiple companies in parallel
- **AI-Powered Analysis**: Claude analyzes company websites, GitHub repos, and tech stacks
- **Comprehensive Reports**: Overview, tech stack, interview questions, prep tips, and more

### 📊 Interview Pipeline Dashboard
- **Track All Interviews**: Manage companies across different interview stages
- **Visual Pipeline**: See at a glance where each interview stands
- **Stage Management**: Applied → Screening → Technical → Final → Offer
- **Research History**: Keep track of when companies were last researched
- **Notes & Scheduling**: Add notes and schedule interview dates

### 🤖 Automation with Trigger.dev
- **Nightly Refresh**: Automatically update research for active companies
- **Batch Jobs**: Process multiple companies in parallel
- **Calendar Sync**: Auto-detect interviews from Google Calendar
- **Email Alerts**: Get prep reports 24 hours before interviews

### 📅 Google Calendar Integration
- **Auto-Detection**: Automatically find interview events
- **Smart Parsing**: Extract company names from event titles
- **Prep Emails**: Beautiful HTML emails with research summaries
- **Upcoming Events**: Dashboard shows next 7 days of interviews

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React-style vanilla JS
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │  RESTful endpoints
│    (Node.js)    │
└────┬─────┬──────┘
     │     │
     │     └──────────┐
     ▼                ▼
┌─────────┐    ┌──────────────┐
│PostgreSQL│    │ Trigger.dev  │  Background jobs
│ Database │    │   (Async)    │
└─────────┘    └──────┬───────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌────────┐  ┌─────────┐  ┌─────────┐
    │Research│  │  Batch  │  │Calendar │
    │  Job   │  │   Job   │  │  Sync   │
    └────────┘  └─────────┘  └─────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Claude API   │  AI analysis
              │  GitHub API   │  Tech stack
              │ Web Scraping  │  Company info
              └───────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.0.0
- PostgreSQL database
- Anthropic API key (Claude)
- (Optional) Trigger.dev account
- (Optional) Google Calendar OAuth credentials

### 1. Clone & Install
```bash
git clone <your-repo>
cd interview-prep-tool
npm install
```

### 2. Set Up Database
```bash
# Option A: Use Railway (recommended for production)
# Create a PostgreSQL database on Railway and copy the DATABASE_URL

# Option B: Local PostgreSQL with Docker
docker run --name interview-prep-db \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=interview_prep \
  -p 5432:5432 \
  -d postgres:15

# Set your DATABASE_URL
export DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/interview_prep"
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
DATABASE_URL=postgresql://...
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

Visit: http://localhost:3000

## 📖 Full Documentation

### Database Schema

The app uses PostgreSQL with 4 main tables:

**companies** - Track all companies in your pipeline
```sql
id, name, stage, last_researched, next_interview, 
research_data (JSONB), notes, created_at, updated_at
```

**research_history** - Historical research versions
```sql
id, company_id, research_data (JSONB), created_at
```

**calendar_events** - Synced interview events
```sql
id, calendar_event_id, company_id, event_title, 
event_date, prep_sent, created_at
```

**batch_jobs** - Track batch research jobs
```sql
id, batch_id, companies[], total, completed, 
results (JSONB), status, created_at, updated_at
```

### API Endpoints

#### Research
- `POST /api/research-direct` - Single company research (sync)
  ```json
  { "companyName": "Railway" }
  ```

- `POST /api/research-batch` - Batch research (async)
  ```json
  { "companies": ["Railway", "PostHog", "Stripe"] }
  ```

- `GET /api/batch-status/:batchId` - Check batch progress

#### Pipeline Management
- `GET /api/pipeline` - Get all companies
- `POST /api/pipeline` - Add company
  ```json
  {
    "companyName": "Railway",
    "stage": "technical",
    "nextInterview": "2025-12-09T10:00:00Z",
    "notes": "Focus on Docker/Kubernetes"
  }
  ```
- `PUT /api/pipeline/:id` - Update company
- `DELETE /api/pipeline/:id` - Remove company
- `POST /api/pipeline/:id/refresh` - Refresh research

#### Calendar
- `GET /api/calendar/connect` - Start OAuth flow
- `GET /api/calendar/callback` - OAuth callback
- `GET /api/calendar/events` - Get upcoming interviews
- `POST /api/calendar/sync` - Manual sync

#### Health
- `GET /health` - Service health check

### Trigger.dev Jobs

The app includes 4 automated jobs:

**1. research-company** - Single company research
```javascript
// Triggered by: API or other jobs
io.sendEvent({
  name: 'research.company',
  payload: { companyName: 'Railway' }
});
```

**2. research-batch** - Parallel batch processing
```javascript
// Triggered by: API batch endpoint
io.sendEvent({
  name: 'research.batch',
  payload: { 
    companies: ['Railway', 'PostHog'],
    batchId: 'uuid-here'
  }
});
```

**3. nightly-refresh** - Daily research updates
```javascript
// Triggered by: Cron (2am daily)
// Automatically refreshes all active companies
```

**4. calendar-sync** - Interview detection
```javascript
// Triggered by: Cron (every 6 hours)
// Scans calendar, detects interviews, sends prep emails
```

## 🔧 Advanced Setup

### Google Calendar Integration

1. **Create OAuth App**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/api/calendar/callback`

2. **Add Credentials**
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
   ```

3. **Authorize**
   - Visit `/api/calendar/connect`
   - Complete OAuth flow
   - Copy refresh token from logs
   - Add to `.env`: `GOOGLE_REFRESH_TOKEN=...`

### Email Notifications

1. **Gmail Setup** (recommended)
   - Enable 2FA on Gmail
   - Generate App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

2. **Configure**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

### Trigger.dev Setup

1. **Create Account**: [trigger.dev](https://trigger.dev)

2. **Get API Key**
   - Create new project
   - Copy development API key

3. **Configure**
   ```env
   TRIGGER_API_KEY=tr_dev_xxxxx
   TRIGGER_API_URL=https://api.trigger.dev
   ```

4. **Deploy Jobs**
   ```bash
   npx trigger.dev@latest dev
   ```

## 🚢 Deployment

### Railway (Recommended)

Railway provides native PostgreSQL and easy deployment.

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create Project**
   ```bash
   railway init
   railway add postgresql
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx
   # DATABASE_URL is automatically set by Railway
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Run Migrations**
   ```bash
   railway run npm run migrate
   ```

Your app will be live at: `https://your-app.railway.app`

### Other Platforms

The app works on any Node.js platform:
- **Render**: Connect PostgreSQL addon
- **Heroku**: Use Heroku Postgres
- **Fly.io**: Attach Postgres database
- **DigitalOcean**: App Platform + Managed PostgreSQL

## 💰 Cost Breakdown

Estimated monthly costs for production use:

- **Railway**: $5-10/month (PostgreSQL + hosting)
- **Anthropic API**: $5-20/month (depends on usage)
- **Trigger.dev**: Free tier (3,000 runs/month)
- **Google Calendar**: Free
- **Gmail SMTP**: Free

**Total**: $10-30/month

## 🧪 Testing

Test with these companies (pre-configured):
- Railway
- PostHog  
- Toast
- Stripe
- Trigger.dev
- Linear
- Anthropic

## 📝 Environment Variables

Complete list of all configuration options:

```env
# Server
PORT=3000
NODE_ENV=production

# Database (Required)
DATABASE_URL=postgresql://user:pass@host:port/db

# Anthropic API (Required)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Trigger.dev (Optional - for background jobs)
TRIGGER_API_KEY=tr_dev_xxxxx
TRIGGER_API_URL=https://api.trigger.dev

# Google Calendar (Optional)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
GOOGLE_REFRESH_TOKEN=xxxxx

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

## 🗺️ Roadmap

Future enhancements:
- [ ] LinkedIn integration for recruiter tracking
- [ ] Glassdoor API for interview reviews
- [ ] Custom question banks per role
- [ ] Interview recording analysis
- [ ] Team collaboration features
- [ ] Mobile app (React Native)
- [ ] Slack/Discord notifications
- [ ] Interview outcome tracking & analytics

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

Built with:
- [Claude AI](https://anthropic.com) - AI-powered research
- [Trigger.dev](https://trigger.dev) - Background job automation
- [PostgreSQL](https://postgresql.org) - Reliable database
- [Express](https://expressjs.com) - Fast web framework
- [Railway](https://railway.app) - Easy deployment

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: See [QUICKSTART.md](./QUICKSTART.md)
- **Email**: your-email@example.com

---

**Made with ❤️ for job seekers everywhere. Good luck with your interviews! 🚀**
