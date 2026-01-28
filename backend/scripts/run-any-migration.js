const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration(fileName) {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, '..', '..', 'migrations', fileName);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`Running migration: ${fileName}`);
    await client.query(sql);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

const target = process.argv[2] || '036_consolidated_fix.sql';
runMigration(target);
