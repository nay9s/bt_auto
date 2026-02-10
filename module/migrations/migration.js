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

        // 4. Create History Table
        await sql.query(`
            CREATE TABLE IF NOT EXISTS history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                car_id INT NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                service_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Migration: History table checked/created.');

        // 5. Create Inventory Table
        await sql.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                sku VARCHAR(50) UNIQUE NOT NULL,
                category VARCHAR(50) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                min_quantity INT NOT NULL DEFAULT 5,
                cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                supplier VARCHAR(100),
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Migration: Inventory table checked/created.');

        // 6. Create Work Order Items Table
        await sql.query(`
            CREATE TABLE IF NOT EXISTS work_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id INT NOT NULL,
                inventory_id INT DEFAULT NULL,
                item_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Migration: Work Order Items table checked/created.');

        // 7. Create Work Order History Table
        await sql.query(`
            CREATE TABLE IF NOT EXISTS work_order_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INT DEFAULT NULL,
                FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Migration: Work Order History table checked/created.');

        console.log('All migrations completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
        // Don't exit process, just log error, maybe database is not ready or other issue
    }
}

module.exports = { runMigrations };
