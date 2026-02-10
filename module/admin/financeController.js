const { promisePool: sql } = require('../sql/mysql');

// Helper to get date range based on period
function getDateRange(period) {
    const now = new Date();
    let startDate, endDate;
    let groupByFormat; // MySQL format string for grouping
    let labels = []; // Labels for chart

    // Set end date to end of today
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
        case 'daily':
            // Past 30 days
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
            groupByFormat = '%Y-%m-%d';
            break;
        case 'weekly':
            // Past 12 weeks
            startDate = new Date(now);
            startDate.setDate(now.getDate() - (12 * 7));
            startDate.setHours(0, 0, 0, 0);
            groupByFormat = '%Y-%u'; // Year-Week
            break;
        case 'monthly':
            // Past 12 months
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            startDate.setHours(0, 0, 0, 0);
            groupByFormat = '%Y-%m';
            break;
        case 'yearly':
            // Past 5 years
            startDate = new Date(now.getFullYear() - 4, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            groupByFormat = '%Y';
            break;
        default:
            // Default to Monthly
            startDate = new Date(now.getFullYear(), 0, 1); // Start of year
            groupByFormat = '%Y-%m';
    }

    return { startDate, endDate, groupByFormat };
}

async function getFinanceData(period = 'monthly') {
    const { startDate, endDate, groupByFormat } = getDateRange(period);

    // 1. Get Totals (Cards)
    // Revenue: Sum of completed work orders in this period
    const [revenueRows] = await sql.query(`
        SELECT SUM(total_price) as totalRevenue
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        WHERE wo.status = 'completed'
        AND wo.appointment_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const totalRevenue = revenueRows[0].totalRevenue || 0;

    // Expenses: Sum of (Cost Price * Quantity) for items used in completed orders
    const [expenseRows] = await sql.query(`
        SELECT SUM(i.cost_price * woi.quantity) as totalExpenses
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN inventory i ON woi.inventory_id = i.id
        WHERE wo.status = 'completed'
        AND wo.appointment_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const totalExpenses = expenseRows[0].totalExpenses || 0;
    const netProfit = totalRevenue - totalExpenses;
    const cashFlow = totalRevenue; // For MVP, assuming Cash In flow

    // 2. Get Chart Data (Revenue vs Expenses over time)
    const [chartRows] = await sql.query(`
        SELECT 
            DATE_FORMAT(wo.appointment_date, ?) as dateLabel,
            SUM(woi.total_price) as revenue,
            SUM(COALESCE(i.cost_price, 0) * woi.quantity) as expenses
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN inventory i ON woi.inventory_id = i.id
        WHERE wo.status = 'completed'
        AND wo.appointment_date BETWEEN ? AND ?
        GROUP BY dateLabel
        ORDER BY dateLabel ASC
    `, [groupByFormat, startDate, endDate]);

    // 3. Get Expense Categories (Stacked Bar / Pie)
    const [categoryRows] = await sql.query(`
        SELECT 
            i.category,
            SUM(i.cost_price * woi.quantity) as totalCost
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN inventory i ON woi.inventory_id = i.id
        WHERE wo.status = 'completed'
        AND wo.appointment_date BETWEEN ? AND ?
        GROUP BY i.category
        ORDER BY totalCost DESC
    `, [startDate, endDate]);

    return {
        cards: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: netProfit,
            cashFlow: cashFlow
        },
        chart: {
            labels: chartRows.map(row => row.dateLabel),
            revenue: chartRows.map(row => row.revenue),
            expenses: chartRows.map(row => row.expenses)
        },
        categories: {
            labels: categoryRows.map(row => row.category),
            data: categoryRows.map(row => row.totalCost)
        }
    };
}

module.exports = {
    getFinanceData
};
