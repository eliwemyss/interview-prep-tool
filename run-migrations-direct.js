#!/usr/bin/env node
/**
 * Run migrations directly on Railway database using DATABASE_URL
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`\n📋 Found ${migrationFiles.length} migrations:`, migrationFiles);

    for (const file of migrationFiles) {
      console.log(`\n🔄 Running: ${file}`);
      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        console.log(`  ✅ ${file} - SUCCESS`);
      } catch (error) {
        // Check if already applied
        if (error.code === '42701' || error.code === '42P07' || error.code === '42P16') {
          console.log(`  ⏭️  ${file} - ALREADY APPLIED`);
        } else {
          console.log(`  ⚠️  ${file} - ${error.code}: ${error.message}`);
        }
      }
    }

    client.release();
    await pool.end();
    console.log('\n✅ Migrations complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigrations();
