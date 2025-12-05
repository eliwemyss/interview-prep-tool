# 🚀 Interview Prep Tool - Quickstart Guide

Get up and running in 5 minutes!

## ⚡ Prerequisites Checklist

Before you start, make sure you have:

- [ ] Node.js 18 or higher ([download](https://nodejs.org/))
- [ ] PostgreSQL database access
- [ ] Anthropic API key ([get one](https://console.anthropic.com/))

Optional (can add later):
- [ ] Trigger.dev account for background jobs
- [ ] Google Calendar OAuth credentials
- [ ] Gmail account for email notifications

## 📦 5-Minute Local Setup

### Step 1: Clone and Install (1 min)

```bash
# Clone the repository
git clone <your-repo-url>
cd interview-prep-tool

# Install dependencies
npm install
```

### Step 2: Database Setup (2 min)

**Option A: Docker (Easiest)**
```bash
# Start PostgreSQL in Docker
docker run --name interview-prep-db \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=interview_prep \
  -p 5432:5432 \
  -d postgres:15

# Wait 10 seconds for startup
sleep 10
```

**Option B: Existing PostgreSQL**
```bash
# Create database
createdb interview_prep
```

### Step 3: Configure Environment (1 min)

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your editor
nano .env
```

**Minimum required configuration:**
```env
# Database
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/interview_prep

# Anthropic API (get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Step 4: Initialize Database (30 sec)

```bash
# Run migrations
npm run migrate

# Should see: ✅ Migration completed successfully
```

### Step 5: Start Server (30 sec)

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

You should see:
```
🚀 Interview Prep Tool Server
📡 Server running on http://localhost:3000
✅ Database connected
```

### Step 6: Test It Out!

1. Open browser: http://localhost:3000
2. Enter a company name: "Railway"
3. Click "Start Research"
4. Wait ~30 seconds
5. See your interview prep report! 🎉

## 🔑 Getting API Keys

### Anthropic API Key (Required)

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-xxxxx`

**Cost**: ~$5-20/month depending on usage. First $5 usually free.

### Trigger.dev API Key (Optional)

For background jobs and automation.

1. Go to https://trigger.dev
2. Sign up (free tier available)
3. Create a new project
4. Copy your development API key
5. Add to `.env`: `TRIGGER_API_KEY=tr_dev_xxxxx`

**Cost**: Free tier includes 3,000 job runs/month

### Google Calendar OAuth (Optional)

For auto-detecting interviews.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/calendar/callback`
5. Download credentials JSON
6. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
   ```

**Cost**: Free

### Gmail SMTP (Optional)

For sending prep emails.

1. Enable 2-Factor Authentication on your Gmail
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate new app password
4. Add to `.env`:
   ```env
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

**Cost**: Free

## 🎯 First Steps After Setup

### 1. Research a Company
```
http://localhost:3000
→ Enter "Railway"
→ Click "Start Research"
→ Get instant prep report
```

### 2. Try Batch Research
```
Enter multiple companies:
Railway, PostHog, Stripe, Linear

→ Click "Start Batch Research"
→ See real-time progress
→ Get all results when done
```

### 3. Explore the Dashboard
```
http://localhost:3000/dashboard
→ Add companies to pipeline
→ Set interview stages
→ Schedule interview dates
→ Track your progress
```

### 4. Add Your First Interview
```
Dashboard → "+ Add Company"
→ Company: Railway
→ Stage: Technical
→ Date: [Pick a date]
→ Notes: Focus on Docker/K8s
→ Save
```

## 🐛 Troubleshooting

### Database Connection Failed

**Error**: `Error: connect ECONNREFUSED`

**Fix**:
```bash
# Check PostgreSQL is running
docker ps  # Should show interview-prep-db

# If not running, start it
docker start interview-prep-db

# Check DATABASE_URL in .env is correct
```

### Claude API Error

**Error**: `401 Unauthorized` or `Invalid API key`

**Fix**:
```bash
# Verify API key in .env
cat .env | grep ANTHROPIC

# Key should start with sk-ant-
# Get new key from https://console.anthropic.com/
```

### Migration Failed

**Error**: `Migration failed: relation already exists`

**Fix**:
```bash
# Drop and recreate database
dropdb interview_prep
createdb interview_prep
npm run migrate
```

### Port 3000 Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Fix**:
```bash
# Option A: Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Option B: Use different port
echo "PORT=3001" >> .env
npm start
```

### Dependencies Won't Install

**Error**: `npm ERR! code ERESOLVE`

**Fix**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

Once you're up and running:

1. **Read the Full README**: See [README.md](./README.md) for detailed docs
2. **Set Up Trigger.dev**: Enable background jobs and automation
3. **Connect Google Calendar**: Auto-detect interview events
4. **Configure Emails**: Get prep reports before interviews
5. **Deploy to Production**: Use Railway for easy hosting

## 🚢 Deploy to Railway (5 min)

Railway makes deployment super easy:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Set environment variables
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx

# Deploy
railway up

# Run migrations
railway run npm run migrate
```

Your app is now live! 🎉

Get the URL:
```bash
railway domain
```

## 💡 Pro Tips

1. **API Key Security**: Never commit `.env` to git
2. **Database Backups**: Railway auto-backs up PostgreSQL
3. **Rate Limiting**: Claude API has rate limits, batch wisely
4. **Caching**: Research results are cached in database
5. **Testing**: Use test companies (Railway, PostHog, etc.)

## 📞 Need Help?

- **Issues**: Check [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: See [README.md](./README.md)
- **Email**: your-email@example.com

## ✅ Verification Checklist

Make sure everything works:

- [ ] Server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Database migration completed
- [ ] Can research a single company
- [ ] Results appear correctly
- [ ] Dashboard loads
- [ ] Can add company to pipeline
- [ ] Can view research in modal

If all checked ✅ - you're ready to go! 🚀

---

**Need to stop?**
```bash
# Stop the server: Ctrl+C

# Stop database:
docker stop interview-prep-db

# Restart later:
docker start interview-prep-db
npm start
```

Happy interviewing! 🎯
