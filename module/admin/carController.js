const { promisePool: sql } = require('../sql/mysql');

async function getCars(page = 1, limit = 10, search = '', status = '') {
    const offset = (page - 1) * limit;

    try {
        let params = [];
        let searchWhere = "";
        let statusCondition = "";

        // Base Joins
        const baseJoins = `
            JOIN users u ON c.user_id = u.id
            LEFT JOIN work_orders wo ON c.id = wo.car_id
        `;

        // Search condition
        if (search) {
            searchWhere = ` WHERE (c.brand LIKE ? OR c.model LIKE ? OR c.license_plate LIKE ? OR c.vin LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
        }

        // Status Filter
        if (status === 'ready') {
            const connector = searchWhere ? ' AND ' : ' WHERE ';
            statusCondition = `${connector} NOT EXISTS (SELECT 1 FROM work_orders wo WHERE wo.car_id = c.id AND wo.status != 'completed')`;
        } else if (status === 'not_ready') {
            const connector = searchWhere ? ' AND ' : ' WHERE ';
            statusCondition = `${connector} EXISTS (SELECT 1 FROM work_orders wo WHERE wo.car_id = c.id AND wo.status != 'completed')`;
        }

        // Combine WHERE clauses
        const whereClause = searchWhere + (searchWhere && statusCondition ? statusCondition.replace(/^( WHERE | AND )/, ' AND ') : statusCondition);

        // Count total cars
        const [countResult] = await sql.query(`
            SELECT COUNT(DISTINCT c.id) as total
            FROM cars c
            JOIN users u ON c.user_id = u.id
            ${whereClause}
        `, params);

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch Cars
        const [rows] = await sql.query(`
            SELECT 
                c.id, 
                c.brand, 
                c.model, 
                c.year, 
                c.license_plate, 
                c.vin, 
                c.image_url,
                u.first_name, 
                u.last_name,
                MAX(wo.appointment_date) AS lastVisit,
                (SELECT status FROM work_orders WHERE car_id = c.id ORDER BY created_at DESC LIMIT 1) as latestStatus
            FROM cars c
            ${baseJoins}
            ${whereClause}
            GROUP BY c.id
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        `, [...params, Number(limit), Number(offset)]);

        // Format data
        const cars = rows.map(row => ({
            id: row.id,
            brand: row.brand,
            model: row.model,
            year: row.year,
            plate: row.license_plate,
            vin: row.vin || '-',
            imageUrl: row.image_url,
            ownerName: `${row.first_name} ${row.last_name}`,
            lastVisit: row.lastVisit ? new Date(row.lastVisit).toLocaleDateString('th-TH') : '-',
            status: mapStatus(row.latestStatus)
        }));

        return {
            cars,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalItems,
                totalPages,
                search: search || '',
                status: status || ''
            }
        };

    } catch (error) {
        throw error;
    }
}

function mapStatus(status) {
    if (!status) return { text: 'พร้อมใช้งาน', class: 'bg-green-100 text-green-800' };

    switch (status) {
        case 'pending': return { text: 'รอตรวจสอบ', class: 'bg-yellow-100 text-yellow-800' };
        case 'checking': return { text: 'กำลังตรวจสอบ', class: 'bg-blue-100 text-blue-800' };
        case 'waiting_parts': return { text: 'รออะไหล่', class: 'bg-orange-100 text-orange-800' };
        case 'repairing': return { text: 'กำลังซ่อม', class: 'bg-purple-100 text-purple-800' };
        case 'completed': return { text: 'เสร็จสิ้น', class: 'bg-gray-100 text-gray-800' };
        case 'ready_for_pickup': return { text: 'รอรับรถ', class: 'bg-green-100 text-green-800' };
        default: return { text: 'พร้อมใช้งาน', class: 'bg-green-100 text-green-800' };
    }
}

async function getCarById(id) {
    try {
        const [rows] = await sql.query(`
            SELECT c.*, u.first_name, u.last_name, u.phone
            FROM cars c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [id]);

        if (rows.length === 0) return null;

        const car = rows[0];
        return {
            id: car.id,
            brand: car.brand,
            model: car.model,
            year: car.year,
            licensePlate: car.license_plate,
            vin: car.vin,
            userId: car.user_id,
            imageUrl: car.image_url,
            ownerName: `${car.first_name} ${car.last_name}`,
            ownerPhone: car.phone
        };
    } catch (error) {
        console.error('Error getting car by ID:', error);
        return null;
    }
}

async function addCar({ brand, model, year, licensePlate, vin, userId }, file) {
    if (!brand || !model || !year || !licensePlate || !userId) {
        return { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    try {
        // Check for duplicate license plate
        const [existing] = await sql.query('SELECT id FROM cars WHERE license_plate = ?', [licensePlate]);
        if (existing.length > 0) {
            return { success: false, error: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' };
        }

        const imageUrl = file ? `/uploads/cars/${file.filename}` : null;

        await sql.query(
            'INSERT INTO cars (user_id, brand, model, year, license_plate, vin, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, brand, model, year, licensePlate, vin || null, imageUrl]
        );

        return { success: true };
    } catch (error) {
        console.error('Error adding car:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' };
    }
}

async function editCar(id, { brand, model, year, licensePlate, vin, userId }, file) {
    if (!id || !brand || !model || !year || !licensePlate || !userId) {
        return { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    try {
        // Check for duplicate license plate (excluding self)
        const [existing] = await sql.query('SELECT id FROM cars WHERE license_plate = ? AND id != ?', [licensePlate, id]);
        if (existing.length > 0) {
            return { success: false, error: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว (ซ้ำกับคันอื่น)' };
        }

        let updateQuery = 'UPDATE cars SET brand=?, model=?, year=?, license_plate=?, vin=?, user_id=?';
        let params = [brand, model, year, licensePlate, vin || null, userId];

        if (file) {
            const imageUrl = `/uploads/cars/${file.filename}`;
            updateQuery += ', image_url=?';
            params.push(imageUrl);
        }

        updateQuery += ' WHERE id=?';
        params.push(id);

        await sql.query(updateQuery, params);

        return { success: true };
    } catch (error) {
        console.error('Error editing car:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' };
    }
}

async function searchOwners(query) {
    if (!query) return [];
    try {
        const searchTerm = `%${query}%`;
        const [rows] = await sql.query(`
            SELECT u.id, u.first_name, u.last_name, u.phone
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'user'
            AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.phone LIKE ?)
            LIMIT 10
        `, [searchTerm, searchTerm, searchTerm]);

        return rows.map(row => ({
            id: row.id,
            name: `${row.first_name} ${row.last_name}`,
            phone: row.phone
        }));
    } catch (error) {
        console.error('Error searching owners:', error);
        return [];
    }
}

async function exportCars(search = '') {
    try {
        let params = [];
        let searchWhere = "";

        if (search) {
            searchWhere = ` WHERE (c.brand LIKE ? OR c.model LIKE ? OR c.license_plate LIKE ? OR c.vin LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
        }

        const [rows] = await sql.query(`
            SELECT 
                c.id, 
                c.brand, 
                c.model, 
                c.year, 
                c.license_plate, 
                c.vin,
                u.first_name, 
                u.last_name,
                u.phone,
                (SELECT status FROM work_orders WHERE car_id = c.id ORDER BY created_at DESC LIMIT 1) as latestStatus
            FROM cars c
            JOIN users u ON c.user_id = u.id
            ${searchWhere}
            ORDER BY c.id DESC
        `, params);

        // CSV Header
        let csv = 'ID,Brand,Model,Year,License Plate,VIN,Owner Name,Owner Phone,Status\n';

        rows.forEach(row => {
            const status = mapStatus(row.latestStatus).text;
            csv += `"${row.id}","${row.brand}","${row.model}","${row.year}","${row.license_plate}","${row.vin || ''}","${row.first_name} ${row.last_name}","${row.phone}","${status}"\n`;
        });

        return csv;

    } catch (error) {
        console.error('Error exporting cars:', error);
        throw error;
    }
}

async function deleteCar(id) {
    if (!id) return { success: false, error: 'ไม่พบ ID รถยนต์' };

    try {
        // 1. Get Work Order IDs
        const [workOrders] = await sql.query('SELECT id FROM work_orders WHERE car_id = ?', [id]);
        const workOrderIds = workOrders.map(wo => wo.id);

        if (workOrderIds.length > 0) {
            // 2. Delete Work Order Items
            await sql.query('DELETE FROM work_order_items WHERE work_order_id IN (?)', [workOrderIds]);

            // 3. Delete Work Orders
            await sql.query('DELETE FROM work_orders WHERE car_id = ?', [id]);
        }

        // 4. Delete Car
        await sql.query('DELETE FROM cars WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting car:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
}

module.exports = { getCars, getCarById, addCar, editCar, searchOwners, exportCars, deleteCar };
