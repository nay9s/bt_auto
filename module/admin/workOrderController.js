const { promisePool: sql } = require('../sql/mysql');

// Get all work orders with optional filtering
async function getWorkOrders(page = 1, limit = 10, search = '', status = '') {
    const offset = (page - 1) * limit;
    let query = `
        SELECT 
            wo.*,
            c.brand, c.model, c.license_plate,
            u.first_name, u.last_name, u.phone
        FROM work_orders wo
        JOIN cars c ON wo.car_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR c.license_plate LIKE ?)
    `;
    const queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];

    if (status && status !== 'all') {
        query += ` AND wo.status = ?`;
        queryParams.push(status);
    }

    // Count for pagination
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM work_orders wo
        JOIN cars c ON wo.car_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR c.license_plate LIKE ?)
        ${status && status !== 'all' ? 'AND wo.status = ?' : ''}
    `;

    const [countResult] = await sql.query(countQuery, queryParams); // Use queryParams for count
    const totalItems = countResult[0].total;

    query += ` ORDER BY wo.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [workOrders] = await sql.query(query, queryParams);

    return {
        workOrders,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        }
    };
}

// Get single work order with items
async function getWorkOrderById(id) {
    console.log(`[GetWO] Fetching ID: ${id}`); // DEBUG
    const [rows] = await sql.query(`
        SELECT 
            wo.*,
            c.brand, c.model, c.license_plate, c.year, c.image_url, c.id as car_id,
            u.id as user_id, u.first_name, u.last_name, u.phone, u.email
        FROM work_orders wo
        JOIN cars c ON wo.car_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE wo.id = ?
    `, [id]);

    if (rows.length === 0) {
        console.log(`[GetWO] ID ${id} not found`); // DEBUG
        return null;
    }

    const workOrder = rows[0];

    // Get Items
    const [items] = await sql.query(`
        SELECT * FROM work_order_items WHERE work_order_id = ?
    `, [id]);

    workOrder.items = items;
    console.log(`[GetWO] Found ID ${id} with ${items.length} items`); // DEBUG
    return workOrder;
}

// Create Work Order
async function createWorkOrder(data) {
    const connection = await sql.getConnection();
    try {
        await connection.beginTransaction();

        const { car_id, service_type, description, status, appointment_date, items } = data;
        let totalCost = 0;

        // 1. Insert Work Order
        const [result] = await connection.query(`
            INSERT INTO work_orders (car_id, service_type, description, status, appointment_date, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [car_id, service_type, description, status, appointment_date]);

        const workOrderId = result.insertId;

        // 2. Insert Items (if any)
        if (items && items.length > 0) {
            for (const item of items) {
                const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                totalCost += itemTotal;

                await connection.query(`
                    INSERT INTO work_order_items (work_order_id, inventory_id, item_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [workOrderId, item.inventory_id || null, item.item_name, item.quantity, item.unit_price, itemTotal]);

                // Deduct stock if inventory item
                if (item.inventory_id) {
                    await connection.query(`
                        UPDATE inventory SET quantity = quantity - ? WHERE id = ?
                    `, [item.quantity, item.inventory_id]);
                }
            }
        }

        // 3. Update Total Cost
        await connection.query(`
            UPDATE work_orders SET cost = ? WHERE id = ?
        `, [totalCost, workOrderId]);

        await connection.commit();
        return { success: true, workOrderId };
    } catch (error) {
        await connection.rollback();
        console.error('Create Work Order Error:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

// Helper: Get users for dropdown
async function getUsersForDropdown() {
    const [users] = await sql.query(`
        SELECT id, first_name, last_name, phone FROM users ORDER BY first_name ASC
    `);
    return users;
}

// Helper: Get cars for use
async function getCarsByUserId(userId) {
    const [cars] = await sql.query(`
        SELECT id, brand, model, license_plate FROM cars WHERE user_id = ?
    `, [userId]);
    return cars;
}

// Update Work Order
async function updateWorkOrder(id, data) {
    console.log(`[UpdateWO] Starting update for ID: ${id}`);  // DEBUG
    const connection = await sql.getConnection();
    try {
        await connection.beginTransaction();
        console.log('[UpdateWO] Transaction started'); // DEBUG

        const { car_id, service_type, description, status, appointment_date, items } = data;
        let totalCost = 0;

        // 1. Restore Stock for Old Items
        console.log('[UpdateWO] Restoring stock...'); // DEBUG
        const [oldItems] = await connection.query('SELECT * FROM work_order_items WHERE work_order_id = ?', [id]);
        for (const item of oldItems) {
            if (item.inventory_id) {
                console.log(`[UpdateWO] Restoring item ${item.inventory_id}, qty: ${item.quantity}`); // DEBUG
                await connection.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.inventory_id]);
            }
        }

        // 2. Delete Old Items
        console.log('[UpdateWO] Deleting old items...'); // DEBUG
        await connection.query('DELETE FROM work_order_items WHERE work_order_id = ?', [id]);

        // 3. Update Work Order Details
        console.log('[UpdateWO] Updating WO details...'); // DEBUG
        await connection.query(`
            UPDATE work_orders 
            SET car_id = ?, service_type = ?, description = ?, status = ?, appointment_date = ?, updated_at = NOW()
            WHERE id = ?
        `, [car_id, service_type, description, status, appointment_date, id]);

        // 4. Insert New Items (Same logic as create)
        console.log(`[UpdateWO] Inserting ${items ? items.length : 0} new items...`); // DEBUG
        if (items && items.length > 0) {
            for (const item of items) {
                const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                totalCost += itemTotal;

                await connection.query(`
                    INSERT INTO work_order_items (work_order_id, inventory_id, item_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [id, item.inventory_id || null, item.item_name, item.quantity, item.unit_price, itemTotal]);

                // Deduct stock if inventory item
                if (item.inventory_id) {
                    console.log(`[UpdateWO] Deducting item ${item.inventory_id}, qty: ${item.quantity}`); // DEBUG
                    await connection.query(`
                        UPDATE inventory SET quantity = quantity - ? WHERE id = ?
                    `, [item.quantity, item.inventory_id]);
                }
            }
        }

        // 5. Update Total Cost
        console.log(`[UpdateWO] Updating total cost to ${totalCost}...`); // DEBUG
        await connection.query(`
            UPDATE work_orders SET cost = ? WHERE id = ?
        `, [totalCost, id]);

        await connection.commit();
        console.log('[UpdateWO] Success!'); // DEBUG
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error('Update Work Order Error Full Object:', error); // DEBUG: Full object
        console.error('Update Work Order Error Message:', error.message);
        console.error('Update Work Order Error Stack:', error.stack);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

// Delete Work Order
async function deleteWorkOrder(id) {
    const connection = await sql.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Restore Stock
        const [items] = await connection.query('SELECT * FROM work_order_items WHERE work_order_id = ?', [id]);
        for (const item of items) {
            if (item.inventory_id) {
                await connection.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.inventory_id]);
            }
        }

        // 2. Delete Work Order (Cascade will delete items, but safer to rely on table cascading or manual)
        // Since we defined foreign key with ON DELETE CASCADE, deleting WO is enough.
        await connection.query('DELETE FROM work_orders WHERE id = ?', [id]);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error('Delete WO Error:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

module.exports = {
    getWorkOrders,
    getWorkOrderById,
    createWorkOrder,
    getUsersForDropdown,
    getCarsByUserId,
    updateWorkOrder,
    deleteWorkOrder
};
