# Fix Railway Database - 30 Seconds

The database is missing columns. Run this SQL to fix it NOW.

## Steps:

1. Go to https://railway.app/project/3807d5d5-fcfa-45b7-a1e4-7838312ff984
2. Click the PostgreSQL service (database icon)
3. Click "Data" tab at the top
4. Click the "Query" or "SQL" button
5. Copy ALL the SQL from `ALL_MIGRATIONS.sql` file
6. Paste into the query box
7. Click "Run" or "Execute"
8. Done!

## What this does:

- Adds all missing columns (next_interview, job_title, salary fields, etc.)
- Creates all missing tables if they don't exist
- Safe to run multiple times
- Won't break anything that already exists

## After running:

Your app should work immediately. No restart needed.

The errors about "column does not exist" will disappear.
