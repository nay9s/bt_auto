
const { promisePool: sql } = require('../sql/mysql');

async function runMigrations() {
    try {
        console.log('Checking for database migrations...');

        // Check for 'vin' column in 'cars' table
        const [columns] = await sql.query("SHOW COLUMNS FROM cars LIKE 'vin'");
        if (columns.length === 0) {
            console.log('Applying migration: Add vin column to cars table');
            await sql.query("ALTER TABLE cars ADD COLUMN vin VARCHAR(50) COLLATE utf8mb4_unicode_ci AFTER license_plate");
            console.log('Migration applied successfully.');
        } else {
            console.log('Migration skipped: vin column already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        // Don't exit process, just log error, maybe database is not ready or other issue
    }
}

module.exports = { runMigrations };
