# Fix Database Migrations & Trigger.dev - Do This NOW

## 1. Run Database Migrations (30 seconds)

1. Go to https://railway.app
2. Click your project → PostgreSQL service (database icon)
3. Click "Query" tab
4. Copy/paste this SQL:

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_companies_email_thread ON companies(email_thread_id) WHERE email_thread_id IS NOT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_target_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS salary_research_data JSONB;
CREATE INDEX IF NOT EXISTS idx_companies_salary ON companies(salary_target_min, salary_target_max) WHERE salary_target_min IS NOT NULL;
```

5. Click "Run Query"
6. Done ✅

---

## 2. Fix Trigger.dev Calendar Sync (1 minute)

The calendar sync job is failing because it doesn't know your API URL.

1. Go to https://trigger.dev
2. Go to your project settings
3. Click "Environment Variables"
4. Add this variable:
   - **Key:** `API_URL`
   - **Value:** `https://interviews.himynameiseli.com`
5. Save
6. Redeploy the trigger (or it will auto-deploy on next push)

Done ✅

---

## 3. Research Quality Fix - Coming Next

I'm fixing the research to actually DO the research instead of telling you to research.
Will push fix in next commit.

---

**Total time: 2 minutes to fix everything**
