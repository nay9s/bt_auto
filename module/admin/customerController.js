const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

async function getCustomers(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;

    try {
        let params = [];

        // Base Query Condition
        let queryCondition = `
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'user'
            AND u.id NOT IN (
                SELECT ur_admin.user_id 
                FROM user_roles ur_admin 
                JOIN roles r_admin ON ur_admin.role_id = r_admin.id 
                WHERE r_admin.name = 'admin'
            )
        `;

        // Add Search Condition
        if (search) {
            queryCondition += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        // Count total customers with search filter
        const [countResult] = await sql.query(`
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            ${queryCondition}
        `, params);

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch customers with pagination and search
        const [rows] = await sql.query(`
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.phone,
                COUNT(DISTINCT c.id) AS carCount,
                COALESCE(SUM(CASE WHEN wo.status = 'completed' THEN wo.cost ELSE 0 END), 0) AS totalSpent,
                MAX(wo.appointment_date) AS lastVisit
            FROM users u
            ${queryCondition}
            LEFT JOIN cars c ON u.id = c.user_id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
            GROUP BY u.id
            ORDER BY u.id DESC
            LIMIT ? OFFSET ?
        `, [...params, Number(limit), Number(offset)]);

        // Format data
        const customers = rows.map(row => ({
            id: row.id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            phone: row.phone,
            carCount: row.carCount,
            totalSpent: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(row.totalSpent),
            rawTotalSpent: row.totalSpent, // For potential sorting later
            lastVisit: row.lastVisit ? new Date(row.lastVisit).toLocaleDateString('th-TH') : '-'
        }));

        return {
            customers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalItems,
                totalPages,
                search: search || ''
            }
        };

    } catch (error) {
        throw error;
    }
}

async function exportCustomers(search = '') {
    try {
        let queryCondition = `
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'user'
            AND u.id NOT IN (
                SELECT ur_admin.user_id 
                FROM user_roles ur_admin 
                JOIN roles r_admin ON ur_admin.role_id = r_admin.id 
                WHERE r_admin.name = 'admin'
            )
        `;

        let params = [];
        if (search) {
            queryCondition += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        const [rows] = await sql.query(`
            SELECT 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.phone,
                COUNT(DISTINCT c.id) AS carCount,
                COALESCE(SUM(CASE WHEN wo.status = 'completed' THEN wo.cost ELSE 0 END), 0) AS totalSpent,
                MAX(wo.appointment_date) AS lastVisit
            FROM users u
            ${queryCondition}
            LEFT JOIN cars c ON u.id = c.user_id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
            GROUP BY u.id
            ORDER BY u.id DESC
        `, params);

        // Generate CSV Header
        const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Car Count', 'Total Spent', 'Last Visit'];
        const csvRows = [header.join(',')];

        // Generate CSV Rows
        rows.forEach(row => {
            const lastVisit = row.lastVisit ? new Date(row.lastVisit).toISOString().split('T')[0] : '';
            const values = [
                row.first_name,
                row.last_name,
                row.email || '',
                row.phone,
                row.carCount,
                row.totalSpent,
                lastVisit
            ];
            // Simple CSV escaping
            const escapedValues = values.map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvRows.push(escapedValues.join(','));
        });

        return csvRows.join('\n'); // Add BOM if needed for Excel: '\ufeff' + ...

    } catch (error) {
        throw error;
    }
}

async function addCustomer({ firstName, lastName, phone, email }) {
    if (!firstName || !lastName || !phone) {
        return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ (ชื่อ, นามสกุล, เบอร์โทร)' };
    }

    try {
        // Check if user exists
        const [existing] = await sql.query(
            'SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?',
            [phone, email || '', phone]
        );

        if (existing.length > 0) {
            return { success: false, error: 'ผู้ใช้นี้ (เบอร์โทรหรืออีเมล) มีอยู่ในระบบแล้ว' };
        }

        // Hash password (use phone number as default password)
        const passwordHash = await bcrypt.hash(phone, 10);

        // Use phone as username if email is not provided or just use phone as username standard
        const username = phone;

        // Insert User
        const [result] = await sql.query(
            'INSERT INTO users (username, password_hash, email, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, email || null, firstName, lastName, phone]
        );

        const userId = result.insertId;

        // Assign 'user' role (role_id = 1)
        await sql.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, (SELECT id FROM roles WHERE name = "user"))',
            [userId]
        );

        return { success: true };

    } catch (error) {
        console.error('Error adding customer:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' };
    }
}

module.exports = { getCustomers, addCustomer, exportCustomers };
