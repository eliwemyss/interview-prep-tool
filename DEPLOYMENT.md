# 🚀 Deployment Guide - Railway + Porkbun Custom Domain

Complete guide to deploy your Interview Prep Tool to Railway with a custom subdomain on himynameiseli.com

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Get API Keys](#get-api-keys)
3. [Deploy to Railway](#deploy-to-railway)
4. [Set Up Custom Domain on Porkbun](#set-up-custom-domain-on-porkbun)
5. [Configure Railway for Custom Domain](#configure-railway-for-custom-domain)
6. [Run Database Migration](#run-database-migration)
7. [Verify Deployment](#verify-deployment)
8. [Optional Features Setup](#optional-features-setup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, make sure you have:

- [ ] Railway account ([sign up free](https://railway.app))
- [ ] Porkbun account with himynameiseli.com
- [ ] Git installed on your computer
- [ ] Node.js 18+ installed
- [ ] This project code

---

## Get API Keys

### Step 1: Get Anthropic API Key (Required)

1. Go to https://console.anthropic.com/
2. Sign up or log in with your account
3. Click on "API Keys" in the left sidebar
4. Click "Create Key" button
5. Give it a name like "Interview Prep Tool"
6. Copy the key (starts with `sk-ant-`)
7. **Save this somewhere safe** - you'll need it in Railway

**Cost**: ~$5-20/month depending on usage

---

## Deploy to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser - authorize the CLI.

### Step 3: Initialize Railway Project

```bash
# Navigate to your project directory
cd /Users/eliwemyss/Desktop/Projects/interview-prep-tool/interview-prep-tool

# Initialize Railway project
railway init

# When prompted, choose:
# - Select existing project: "dependable-appreciation" (or create new)
# - Give it a name: "interview-prep-tool"
```

**Note**: You already have a Railway project called "dependable-appreciation"

### Step 4: Add PostgreSQL Database

```bash
railway add
```

When prompted:
- Select "PostgreSQL"
- This automatically creates a database and sets `DATABASE_URL`

### Step 5: Set Environment Variables

```bash
# IMPORTANT: Make sure you're in the correct directory
cd /Users/eliwemyss/Desktop/Projects/interview-prep-tool/interview-prep-tool

# Set your Anthropic API key (Railway CLI v4 syntax)
railway variables --set "ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE"

# Set Node environment
railway variables --set "NODE_ENV=production"
```

**Or via Railway Dashboard (Easier):**
1. Go to https://railway.app
2. Click your project: "dependable-appreciation"
3. Click your service (after you deploy)
4. Click "Variables" tab
5. Click "New Variable"
6. Add variables:
   - `ANTHROPIC_API_KEY` = `sk-ant-xxxxx`
   - `NODE_ENV` = `production`

### Step 6: Deploy Your Code

```bash
# Link to Railway and deploy
railway up
```

This will:
- Upload your code to Railway
- Build the project
- Start the server

**Wait 2-3 minutes for deployment to complete.**

### Step 7: Get Your Railway URL

```bash
railway domain
```

You'll get a URL like: `interview-prep-tool-production.up.railway.app`

**Test this URL** - your app should be live (but without data yet).

---

## Set Up Custom Domain on Porkbun

### Step 1: Log into Porkbun

1. Go to https://porkbun.com
2. Log in to your account
3. Go to "Domain Management"
4. Click on `himynameiseli.com`

### Step 2: Create Subdomain DNS Records

You'll add a CNAME record to point your subdomain to Railway.

**Option A: Using a subdomain like `interviews.himynameiseli.com`**

1. Click "DNS" or "DNS Records"
2. Click "Add" or "Add Record"
3. Fill in:
   - **Type**: `CNAME`
   - **Host**: `interviews` (or whatever you want: `prep`, `jobs`, etc.)
   - **Answer**: `YOUR-APP.up.railway.app` (from `railway domain` command)
   - **TTL**: `600` (or leave default)
4. Click "Add" or "Save"

**Example:**
```
Type: CNAME
Host: interviews
Answer: interview-prep-tool-production.up.railway.app
TTL: 600
```

**Option B: Using root domain `himynameiseli.com`**

If you want the root domain (not recommended if you're using it for other things):

1. You'll need to use an ALIAS or ANAME record (if Porkbun supports it)
2. Or use Railway's IP addresses (check Railway docs)

**Recommendation**: Use a subdomain like `interviews.himynameiseli.com`

### Step 3: Wait for DNS Propagation

DNS changes can take 5 minutes to 48 hours, but usually:
- 5-15 minutes for CNAME records
- Check status: https://www.whatsmydns.net/

Test with:
```bash
# Replace with your subdomain
dig interviews.himynameiseli.com

# Should show CNAME pointing to Railway
```

---

## Configure Railway for Custom Domain

### Step 1: Add Custom Domain in Railway Dashboard

1. Go to https://railway.app
2. Click your project: "interview-prep-tool"
3. Click the service (your app)
4. Click "Settings" tab
5. Scroll to "Domains" section
6. Click "Add Domain" or "Custom Domain"
7. Enter: `interviews.himynameiseli.com` (your subdomain)
8. Click "Add Domain"

### Step 2: Verify Domain

Railway will verify that the CNAME record is set up correctly.

**Status indicators:**
- ⏳ Yellow: Waiting for DNS propagation
- ✅ Green: Domain verified and SSL certificate issued
- ❌ Red: DNS configuration error

**If you see red:**
- Double-check CNAME record in Porkbun
- Make sure there's no trailing dot
- Wait 10-15 minutes for DNS propagation

### Step 3: SSL Certificate (Automatic)

Railway automatically provisions an SSL certificate via Let's Encrypt.

- Usually takes 2-5 minutes after domain verification
- Your site will be accessible via HTTPS automatically

---

## Run Database Migration

Your database is empty - you need to create the tables.

### Option 1: Via Railway CLI (Recommended)

```bash
# From your project directory
railway run npm run migrate
```

You should see:
```
🔄 Starting database migration...
✅ Migration completed successfully
📊 Database schema is ready
```

### Option 2: Via Railway Dashboard

1. Go to your Railway project
2. Click your service
3. Click "Deployments" tab
4. Click the three dots on the latest deployment
5. Click "View Logs"
6. In the service view, you can run commands

**Or use Railway shell:**
```bash
railway run bash
npm run migrate
exit
```

---

## Verify Deployment

### Step 1: Test Your Custom Domain

Visit: `https://interviews.himynameiseli.com`

You should see:
- 🎯 Beautiful purple gradient homepage
- "Interview Prep Tool" title
- Research form
- No errors in browser console

### Step 2: Test Single Company Research

1. Enter "Railway" in the company name field
2. Click "Start Research"
3. Wait ~30 seconds
4. Should see comprehensive research report

If this works: **✅ Deployment successful!**

### Step 3: Test Dashboard

Visit: `https://interviews.himynameiseli.com/dashboard`

- Should load without errors
- Click "+ Add Company"
- Add a test company
- Verify it saves

### Step 4: Check Database Connection

Visit: `https://interviews.himynameiseli.com/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-12-05T...",
  "database": {
    "healthy": true,
    "timestamp": "2025-12-05T..."
  },
  "version": "2.0.0"
}
```

---

## Optional Features Setup

Once your core app is working, add these features:

### 1. Trigger.dev (Background Jobs)

**Enables**: Parallel batch processing, nightly refresh, calendar sync

```bash
# Get API key from https://trigger.dev
railway variables set TRIGGER_API_KEY=tr_dev_xxxxx
railway variables set TRIGGER_API_URL=https://api.trigger.dev

# Redeploy
railway up
```

### 2. Google Calendar Integration

**Enables**: Auto-detect interviews, calendar sync

1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Set redirect URI: `https://interviews.himynameiseli.com/api/calendar/callback`
4. Add variables:

```bash
railway variables set GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
railway variables set GOOGLE_CLIENT_SECRET=xxxxx
railway variables set GOOGLE_REDIRECT_URI=https://interviews.himynameiseli.com/api/calendar/callback

# After first auth, add refresh token:
railway variables set GOOGLE_REFRESH_TOKEN=xxxxx
```

### 3. Email Notifications

**Enables**: Prep emails 24hrs before interviews

```bash
# Get Gmail app password from https://myaccount.google.com/apppasswords
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=your_email@gmail.com
railway variables set SMTP_PASS=your_app_password
railway variables set EMAIL_FROM=your_email@gmail.com

# Redeploy
railway up
```

---

## Troubleshooting

### DNS Issues

**Problem**: "Domain not found" or "Cannot resolve domain"

**Solutions**:
```bash
# Check DNS propagation
dig interviews.himynameiseli.com

# Should show:
# interviews.himynameiseli.com. 600 IN CNAME your-app.up.railway.app.

# If not, double-check Porkbun DNS settings
# Wait 15-30 minutes and try again
```

### Railway Domain Not Verifying

**Problem**: Domain shows yellow/red in Railway

**Solutions**:
1. Ensure CNAME record in Porkbun points to Railway domain (no `https://`, no trailing `/`)
2. Remove any other A records for the same subdomain
3. Wait 10-15 minutes for DNS propagation
4. Try removing and re-adding the domain in Railway

### Database Connection Error

**Problem**: Health check shows database unhealthy

**Solutions**:
```bash
# Check if DATABASE_URL is set
railway variables

# Should show DATABASE_URL (automatically set by Railway)

# Run migration again
railway run npm run migrate

# Check logs
railway logs
```

### Migration Fails

**Problem**: `Migration failed: relation already exists`

**Solution**:
```bash
# This means tables already exist - that's okay!
# Your database is ready to use

# Or if you need to reset (WARNING: deletes all data):
railway run psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
railway run npm run migrate
```

### 500 Internal Server Error

**Problem**: App loads but research fails

**Solutions**:
1. Check Anthropic API key is set correctly:
   ```bash
   railway variables
   # Verify ANTHROPIC_API_KEY is present
   ```

2. Check logs for errors:
   ```bash
   railway logs
   ```

3. Verify API key is valid at https://console.anthropic.com/

### SSL Certificate Issues

**Problem**: HTTPS not working or "Not Secure" warning

**Solutions**:
1. Wait 5-10 minutes after domain verification
2. Railway auto-provisions SSL via Let's Encrypt
3. Check domain status in Railway dashboard
4. Force HTTPS by clearing browser cache

### App Won't Deploy

**Problem**: Deployment fails or crashes

**Solutions**:
```bash
# Check build logs
railway logs

# Common issues:
# 1. Missing dependencies - check package.json
# 2. Node version - ensure engines.node >= 18.0.0
# 3. Start command - should be "node server.js"

# Redeploy
railway up
```

---

## Quick Reference Commands

```bash
# View logs
railway logs

# See all environment variables
railway variables

# Set a variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY

# Run migration
railway run npm run migrate

# Open Railway dashboard
railway open

# Get domain info
railway domain

# Redeploy
railway up

# Connect to database (PostgreSQL)
railway run psql $DATABASE_URL
```

---

## DNS Configuration Summary

**Your Porkbun DNS should look like this:**

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| CNAME | interviews | interview-prep-tool-production.up.railway.app | 600 |

**Railway Domain Settings:**

| Custom Domain | Status | SSL |
|---------------|--------|-----|
| interviews.himynameiseli.com | ✅ Verified | ✅ Active |

---

## Final Checklist

Before sharing your app:

- [ ] Custom domain working: `https://interviews.himynameiseli.com`
- [ ] Health check passes: `/health`
- [ ] Single research works
- [ ] Dashboard loads and saves data
- [ ] Database migration completed
- [ ] SSL certificate active (HTTPS)
- [ ] No errors in browser console
- [ ] Anthropic API key configured
- [ ] Optional: Trigger.dev configured
- [ ] Optional: Google Calendar configured
- [ ] Optional: Email configured

---

## Cost Summary

**Monthly Costs:**
- Railway PostgreSQL: $5
- Railway Compute: $5
- Anthropic API: $5-20 (usage-based)
- Porkbun Domain: Already owned
- DNS/Subdomain: Free

**Total: $15-30/month**

---

## Support & Updates

**View Logs**: `railway logs`
**Monitor Usage**: https://railway.app dashboard → Usage tab
**Database Backups**: Railway auto-backs up PostgreSQL daily

**Update Code:**
```bash
# Make changes locally
git add .
git commit -m "Update features"

# Deploy
railway up
```

---

## Success! 🎉

Your Interview Prep Tool is now live at:
**https://interviews.himynameiseli.com**

Share it with:
- Job seekers preparing for interviews
- Career coaches
- Friends going through interview processes

Good luck with your interviews! 🚀
