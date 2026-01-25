const fs = require('fs');
const path = require('path');
// Try to require pg from backend node_modules, or global, or local
let pg;
try {
    pg = require('./backend/node_modules/pg');
} catch (e) {
    try {
        pg = require('pg');
    } catch (e2) {
        console.error("Could not find 'pg' module. Please run 'npm install pg' in the root or ensure backend dependencies are installed.");
        process.exit(1);
    }
}

const { Pool } = pg;

// Database configuration
const dbConfig = {
    user: 'postgres',
    password: '*DominO050325*',
    host: 'db.hwtbbhvdjialwtyolzzm.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
};

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
    const pool = new Pool(dbConfig);
    let client;

    try {
        console.log('Connecting to database...');
        client = await pool.connect();
        console.log('Connected successfully.');

        // Get list of migration files
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure alphabetical order (001, 002, etc.)

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            console.log(`\nRunning migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                // Start a transaction for each file
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ ${file} completed successfully.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`❌ Error running ${file}:`);
                console.error(err.message);
                // Decide if we want to stop or continue. For now, we stop on error.
                // However, some migrations might fail if objects already exist (if not using IF NOT EXISTS).
                // Let's try to continue but warn.
                console.log('Continuing to next migration...');
            }
        }

        console.log('\nAll migrations processed.');

    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

runMigrations();