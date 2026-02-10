const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

async function getCustomers(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;

    try {
        let params = [];
        let searchWhere = "";

        // Base Joins (Roles)
        const baseJoins = `
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
        `;

        // Base Where (Role Filtering)
        const baseWhere = `
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
            searchWhere = ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        // Count total customers
        // Count query only needs base joins + where + search
        const [countResult] = await sql.query(`
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            ${baseJoins}
            ${baseWhere}
            ${searchWhere}
        `, params);

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch customers with pagination and search
        // Main query needs base joins + EXTRA joins (cars/work_orders) + where + search
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
            ${baseJoins}
            LEFT JOIN cars c ON u.id = c.user_id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
            ${baseWhere}
            ${searchWhere}
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
        let params = [];
        let searchWhere = "";

        const baseJoins = `
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
        `;

        const baseWhere = `
            WHERE r.name = 'user'
            AND u.id NOT IN (
                SELECT ur_admin.user_id 
                FROM user_roles ur_admin 
                JOIN roles r_admin ON ur_admin.role_id = r_admin.id 
                WHERE r_admin.name = 'admin'
            )
        `;

        if (search) {
            searchWhere = ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
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
            ${baseJoins}
            LEFT JOIN cars c ON u.id = c.user_id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
            ${baseWhere}
            ${searchWhere}
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

        return csvRows.join('\n');

    } catch (error) {
        throw error;
    }
}

async function addCustomer({ firstName, lastName, phone, email }) {
    if (!firstName || !lastName || !phone) {
        return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ (ชื่อ, นามสกุล, เบอร์โทร)' };
    }

    try {
        const [existing] = await sql.query(
            'SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?',
            [phone, email || '', phone]
        );

        if (existing.length > 0) {
            return { success: false, error: 'ผู้ใช้นี้ (เบอร์โทรหรืออีเมล) มีอยู่ในระบบแล้ว' };
        }

        const passwordHash = await bcrypt.hash(phone, 10);
        const username = phone;
        const [result] = await sql.query(
            'INSERT INTO users (username, password_hash, email, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, email || null, firstName, lastName, phone]
        );

        const userId = result.insertId;
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

async function getCustomerById(id) {
    try {
        const [rows] = await sql.query(`
            SELECT id, first_name, last_name, email, phone
            FROM users
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) return null;

        const user = rows[0];
        return {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone
        };
    } catch (error) {
        console.error('Error getting customer by ID:', error);
        return null;
    }
}

async function editCustomer(id, { firstName, lastName, phone, email }) {
    if (!id || !firstName || !lastName || !phone) {
        return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ' };
    }

    try {
        // Check for duplicate phone/email (excluding self)
        const [existing] = await sql.query(
            'SELECT id FROM users WHERE (phone = ? OR email = ?) AND id != ?',
            [phone, email || '', id]
        );

        if (existing.length > 0) {
            return { success: false, error: 'เบอร์โทรหรืออีเมลนี้มีผู้ใช้อื่นใช้งานแล้ว' };
        }

        // Update user
        await sql.query(
            'UPDATE users SET first_name=?, last_name=?, phone=?, email=?, username=? WHERE id=?',
            [firstName, lastName, phone, email || null, phone, id]
        );

        return { success: true };
    } catch (error) {
        console.error('Error editing customer:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' };
    }
}

async function deleteCustomer(id) {
    if (!id) return { success: false, error: 'ไม่พบ ID ลูกค้า' };

    try {
        // 1. Get all cars for this user
        const [cars] = await sql.query('SELECT id FROM cars WHERE user_id = ?', [id]);
        const carIds = cars.map(c => c.id);

        if (carIds.length > 0) {
            // 2. Delete Work Orders items for these cars
            // We need work_order_ids first
            const [waste] = await sql.query('SELECT id FROM work_orders WHERE car_id IN (?)', [carIds]);
            const workOrderIds = waste.map(wo => wo.id);

            if (workOrderIds.length > 0) {
                await sql.query('DELETE FROM work_order_items WHERE work_order_id IN (?)', [workOrderIds]);
                // 3. Delete Work Orders
                await sql.query('DELETE FROM work_orders WHERE car_id IN (?)', [carIds]);
            }

            // 4. Delete Cars
            await sql.query('DELETE FROM cars WHERE user_id = ?', [id]);
        }

        // 5. Delete User Roles
        await sql.query('DELETE FROM user_roles WHERE user_id = ?', [id]);

        // 6. Delete User
        await sql.query('DELETE FROM users WHERE id = ?', [id]);

        return { success: true };

    } catch (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล (อาจมีข้อมูลที่เกี่ยวข้อง)' };
    }
}

module.exports = { getCustomers, addCustomer, exportCustomers, getCustomerById, editCustomer, deleteCustomer };
