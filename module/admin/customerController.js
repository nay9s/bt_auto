const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

async function getCustomers(page = 1, limit = 10) {
    // ... existing code ...
    const offset = (page - 1) * limit;

    try {
        // Count total customers (Users who have role 'user' and NOT 'admin')
        const [countResult] = await sql.query(`
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'user'
            AND u.id NOT IN (
                SELECT ur_admin.user_id 
                FROM user_roles ur_admin 
                JOIN roles r_admin ON ur_admin.role_id = r_admin.id 
                WHERE r_admin.name = 'admin'
            )
        `);

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch customers with pagination
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
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN cars c ON u.id = c.user_id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
            WHERE r.name = 'user'
            AND u.id NOT IN (
                SELECT ur_admin.user_id 
                FROM user_roles ur_admin 
                JOIN roles r_admin ON ur_admin.role_id = r_admin.id 
                WHERE r_admin.name = 'admin'
            )
            GROUP BY u.id
            ORDER BY u.id DESC
            LIMIT ? OFFSET ?
        `, [Number(limit), Number(offset)]);

        // Format data
        const customers = rows.map(row => ({
            id: row.id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            phone: row.phone,
            carCount: row.carCount,
            totalSpent: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(row.totalSpent),
            lastVisit: row.lastVisit ? new Date(row.lastVisit).toLocaleDateString('th-TH') : '-'
        }));

        return {
            customers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalItems,
                totalPages
            }
        };

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

module.exports = { getCustomers, addCustomer };
