#!/usr/bin/env node
/**
 * Run this locally to execute migrations on Railway database
 * Usage: node run-migrations-now.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Running migrations on Railway database...\n');

try {
  // Use Railway CLI to run the migration script
  const command = 'railway run node scripts/migrate.js';

  console.log('Executing:', command);
  console.log('');

  const output = execSync(command, {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  console.log('\n✅ Migrations completed successfully!');
} catch (error) {
  console.error('\n❌ Migration failed');
  console.error('Error:', error.message);
  console.error('\nTry running manually:');
  console.error('  railway run node scripts/migrate.js');
  process.exit(1);
}
