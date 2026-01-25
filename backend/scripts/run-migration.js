const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, '..', '..', 'migrations', '023_mistakes_rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration: 023_mistakes_rpc.sql');
    await client.query(sql);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
