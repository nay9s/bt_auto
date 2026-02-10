const { promisePool: sql } = require('../sql/mysql');

async function getDashboardStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // 1. Revenue Stats
        const [revenueRows] = await sql.query(`
            SELECT 
                SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as totalRevenue,
                SUM(CASE WHEN status = 'completed' AND DATE(appointment_date) = ? THEN total_price ELSE 0 END) as todayRevenue
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
        `, [today]);

        const totalRevenue = revenueRows[0].totalRevenue || 0;
        const todayRevenue = revenueRows[0].todayRevenue || 0;

        // 1.1 Cost & Profit Stats
        const [costRows] = await sql.query(`
            SELECT 
                SUM(woi.quantity * COALESCE(i.cost_price, 0)) as totalCost
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
            LEFT JOIN inventory i ON woi.inventory_id = i.id
            WHERE wo.status = 'completed'
        `);

        const totalCost = costRows[0].totalCost || 0;
        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // 2. Car Stats
        const [carRows] = await sql.query(`
            SELECT 
                COUNT(*) as totalCarsAllTime,
                SUM(CASE WHEN DATE(appointment_date) = ? THEN 1 ELSE 0 END) as totalCarsToday,
                SUM(CASE WHEN MONTH(appointment_date) = MONTH(?) AND YEAR(appointment_date) = YEAR(?) THEN 1 ELSE 0 END) as totalCarsMonth,
                SUM(CASE WHEN YEAR(appointment_date) = YEAR(?) THEN 1 ELSE 0 END) as totalCarsYear,
                SUM(CASE WHEN status IN ('pending', 'checking') AND DATE(appointment_date) = ? THEN 1 ELSE 0 END) as bookingIncoming,
                SUM(CASE WHEN status = 'repairing' THEN 1 ELSE 0 END) as repairing
            FROM work_orders
            WHERE status != 'canceled'
        `, [today, today, today, today, today]);

        // 3. Status Overview (All time active)
        const [statusRows] = await sql.query(`
            SELECT 
                SUM(CASE WHEN status = 'checking' THEN 1 ELSE 0 END) as checking,
                SUM(CASE WHEN status = 'waiting_parts' THEN 1 ELSE 0 END) as waitingParts,
                SUM(CASE WHEN status = 'repairing' THEN 1 ELSE 0 END) as repairing,
                SUM(CASE WHEN status = 'completed' AND DATE(updated_at) = ? THEN 1 ELSE 0 END) as completedToday
            FROM work_orders
            WHERE status != 'canceled'
        `, [today]);

        // 4. Delivery Schedule (Today)
        const [deliveryRows] = await sql.query(`
            SELECT wo.id, c.license_plate, c.brand, c.model, wo.status
            FROM work_orders wo
            JOIN cars c ON wo.car_id = c.id
            WHERE wo.status = 'ready_for_pickup'
            AND wo.status != 'canceled'
            LIMIT 5
        `, [today]);

        // 5. Low Stock Alerts
        const [lowStockRows] = await sql.query(`
            SELECT name, quantity, min_quantity
            FROM inventory
            WHERE quantity <= min_quantity
            LIMIT 5
        `);

        // 6. Overdue / Pending
        // Assuming overdue means not completed by end_date (if set) or just old pending
        const [overdueRows] = await sql.query(`
             SELECT wo.id, c.license_plate, c.brand, DATEDIFF(NOW(), wo.appointment_date) as days_passed
             FROM work_orders wo
             JOIN cars c ON wo.car_id = c.id
             WHERE wo.status NOT IN ('completed', 'canceled', 'ready_for_pickup')
             AND wo.appointment_date < ?
             ORDER BY wo.appointment_date ASC
             LIMIT 5
        `, [today]);

        return {
            revenue: {
                total: totalRevenue,
                today: todayRevenue,
                cost: totalCost,
                net: netProfit,
                margin: profitMargin
            },
            cars: {
                today: carRows[0].totalCarsToday || 0,
                month: carRows[0].totalCarsMonth || 0,
                year: carRows[0].totalCarsYear || 0,
                all: carRows[0].totalCarsAllTime || 0,
                incoming: carRows[0].bookingIncoming || 0,
                repairing: carRows[0].repairing || 0
            },
            status: {
                checking: statusRows[0].checking || 0,
                waitingParts: statusRows[0].waitingParts || 0,
                repairing: statusRows[0].repairing || 0,
                completedToday: statusRows[0].completedToday || 0
            },
            deliveries: deliveryRows,
            lowStock: lowStockRows,
            overdue: overdueRows
        };

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw error;
    }
}

module.exports = { getDashboardStats };
