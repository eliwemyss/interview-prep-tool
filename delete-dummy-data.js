#!/usr/bin/env node
/**
 * Delete all dummy/test data from production database
 * Run with: railway run node delete-dummy-data.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false
});

// List of known dummy company names
const DUMMY_COMPANIES = [
  'Railway',
  'PostHog', 
  'Toast',
  'Stripe',
  'Anthropic',
  'Vercel',
  'Trigger.dev'
];

async function deleteDummyData() {
  try {
    console.log('🔍 Checking for dummy data...\n');
    
    // Check what exists
    const companiesCheck = await pool.query(
      'SELECT id, name, created_at FROM companies WHERE name = ANY($1::text[]) ORDER BY name',
      [DUMMY_COMPANIES]
    );
    
    if (companiesCheck.rows.length === 0) {
      console.log('✅ No dummy companies found in database!');
      await pool.end();
      return;
    }
    
    console.log(`Found ${companiesCheck.rows.length} dummy companies:`);
    console.table(companiesCheck.rows);
    
    // Delete them
    console.log('\n🗑️  Deleting dummy companies...');
    const deleteResult = await pool.query(
      'DELETE FROM companies WHERE name = ANY($1::text[]) RETURNING id, name',
      [DUMMY_COMPANIES]
    );
    
    console.log(`\n✅ Deleted ${deleteResult.rowCount} dummy companies:`);
    deleteResult.rows.forEach(row => {
      console.log(`   - ${row.name} (ID: ${row.id})`);
    });
    
    // Final verification
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM companies');
    console.log(`\n📊 Total companies remaining: ${finalCount.rows[0].count}`);
    
    await pool.end();
    console.log('\n✨ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

deleteDummyData();
