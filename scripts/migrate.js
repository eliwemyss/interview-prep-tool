const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('🔄 Starting database migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/001_initial_schema.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
    console.log('📊 Database schema is ready');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
