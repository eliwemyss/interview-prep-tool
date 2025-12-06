# Quick Migration Guide

## ✅ PostHog Keys Added!
All 4 PostHog environment variables are now set in Railway:
- POSTHOG_API_KEY
- POSTHOG_HOST
- NEXT_PUBLIC_POSTHOG_KEY
- NEXT_PUBLIC_POSTHOG_HOST

## 🗄️ Run Database Migrations

### Option 1: Railway PostgreSQL Query Tab (EASIEST - 30 seconds)

1. Go to Railway Dashboard: https://railway.app
2. Select your project: **interview-prep-tool**
3. Click on the **PostgreSQL** service (the database)
4. Go to the **Query** tab
5. Copy/paste this SQL and click "Run":

```sql
-- Migration 004: Add Gmail fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_companies_email_thread ON companies(email_thread_id) WHERE email_thread_id IS NOT NULL;

-- Migration 005: Add Salary fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_research_data JSONB;
CREATE INDEX IF NOT EXISTS idx_companies_salary ON companies(salary_target_min, salary_target_max) WHERE salary_target_min IS NOT NULL;
```

6. Click "Run" - Done! ✅

### Option 2: Railway CLI (Alternative)

```bash
# Open Railway shell
railway shell

# Run migrations
node scripts/migrate.js

# Exit
exit
```

---

## ✅ Verification

After running migrations, verify by running this query in Railway PostgreSQL Query tab:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;
```

You should see the new columns:
- job_title
- interviewer_name
- interviewer_email
- email_thread_id
- salary_target_min
- salary_target_max
- salary_research_data

---

## 🚀 Your App is LIVE!

**URL:** https://interviews.himynameiseli.com

**What's Working:**
✅ PostHog analytics tracking
✅ Dashboard with Kanban board
✅ Company modal with 4 tabs
✅ Salary calculator with Recharts
✅ Gmail sync endpoint
✅ Calendar sync endpoint
✅ All new database fields (after running migrations above)

**Test it:**
1. Visit https://interviews.himynameiseli.com
2. Add a test company
3. Click to open modal
4. Try the Salary Calculator tab
5. Check PostHog dashboard for events!

---

## 🎯 Done!

Once you run those migrations (Option 1 is fastest), everything is 100% complete and ready to use!
