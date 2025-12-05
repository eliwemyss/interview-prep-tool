#!/usr/bin/env node
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('Checking companies...\n');
    const companies = await pool.query('SELECT id, name, stage, created_at FROM companies ORDER BY created_at DESC LIMIT 20;');
    console.log('COMPANIES TABLE:');
    console.table(companies.rows);
    
    console.log('\nChecking calendar_events...\n');
    const events = await pool.query('SELECT event_id, summary, start_time FROM calendar_events ORDER BY start_time DESC LIMIT 20;');
    console.log('CALENDAR_EVENTS TABLE:');
    console.table(events.rows);
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkData();
