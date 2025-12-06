const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Hardcode the connection string for one-time use
const connectionString = 'postgresql://postgres:TrAgXlXYzenGzdwQtcaIXAKnWQdykDPg@monorail.proxy.rlwy.net:50990/railway';

async function runMigrations() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Running migrations...');

    // Migration 004
    console.log('\n📄 Running migration 004_add_gmail_fields.sql...');
    const migration004 = fs.readFileSync(path.join(__dirname, 'migrations/004_add_gmail_fields.sql'), 'utf8');
    await pool.query(migration004);
    console.log('✅ Migration 004 completed');

    // Migration 005
    console.log('\n📄 Running migration 005_add_salary_fields.sql...');
    const migration005 = fs.readFileSync(path.join(__dirname, 'migrations/005_add_salary_fields.sql'), 'utf8');
    await pool.query(migration005);
    console.log('✅ Migration 005 completed');

    console.log('\n✅ All migrations completed successfully!');

    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Companies table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
