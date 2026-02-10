const { promisePool: sql } = require('../sql/mysql');

// Get inventory items with pagination and search
async function getInventory(page = 1, limit = 10, search = '', filter = '') {
    const offset = (page - 1) * limit;
    let query = `
        SELECT * FROM inventory 
        WHERE (name LIKE ? OR sku LIKE ?)
    `;
    const params = [`%${search}%`, `%${search}%`];

    if (filter && filter !== 'all') {
        query += ` AND category = ?`;
        params.push(filter);
    }

    // Count total for pagination
    const [countResult] = await sql.query(`
        SELECT COUNT(*) as total FROM inventory 
        WHERE (name LIKE ? OR sku LIKE ?) ${filter && filter !== 'all' ? 'AND category = ?' : ''}
    `, params);

    const totalItems = countResult[0].total;

    // Get data
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [items] = await sql.query(query, params);

    // Get statistics
    const [stats] = await sql.query(`
        SELECT 
            COUNT(*) as totalItems,
            SUM(quantity * cost_price) as totalValue,
            SUM(CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END) as lowStockCount
        FROM inventory
    `);

    return {
        items,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        },
        stats: stats[0]
    };
}

// Add new inventory item
async function addItem(data, file) {
    try {
        const {
            name, sku, category, quantity, min_quantity,
            cost_price, selling_price, supplier
        } = data;

        const imageUrl = file ? `/uploads/inventory/${file.filename}` : null;

        await sql.query(`
            INSERT INTO inventory (
                name, sku, category, quantity, min_quantity,
                cost_price, selling_price, supplier, image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, sku, category, quantity, min_quantity,
            cost_price, selling_price, supplier, imageUrl
        ]);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update item (placeholder for future use)
async function updateItem(id, data, file) {
    // Implementation for update
}

// Delete item
async function deleteItem(id) {
    try {
        await sql.query('DELETE FROM inventory WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    getInventory,
    addItem,
    updateItem,
    deleteItem
};
