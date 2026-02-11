const { promisePool: sql } = require('./module/sql/mysql');
async function updateSchema() {
    try {
        console.log('Checking cars table schema...');
        const [columns] = await sql.query('SHOW COLUMNS FROM cars LIKE "vin"');

        if (columns.length === 0) {
            console.log('Column "vin" not found. Adding it...');
            await sql.query('ALTER TABLE cars ADD COLUMN vin VARCHAR(50) COLLATE utf8mb4_unicode_ci AFTER license_plate');
            console.log('Column "vin" added successfully.');
        } else {
            console.log('Column "vin" already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
