const { promisePool: sql } = require('../sql/mysql');

// Get Dashboard Stats
exports.getStats = async (req, res) => {
    try {
        // 1. Total Income (Sum of final_cost from completed jobs)
        const [incomeResult] = await sql.query("SELECT SUM(final_cost) as total FROM repair_jobs WHERE status = 'completed'");
        const totalIncome = incomeResult[0].total || 0;

        // 2. Active Jobs (Not completed or delivered)
        const [activeResult] = await sql.query("SELECT COUNT(*) as exact_count FROM repair_jobs WHERE status NOT IN ('completed', 'delivered')");
        const activeJobs = activeResult[0].exact_count;

        // 3. Cars served this month
        const [monthCarsResult] = await sql.query("SELECT COUNT(*) as count FROM repair_jobs WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())");
        const carsThisMonth = monthCarsResult[0].count;

        // 4. Job Status Distribution (for Pie Chart)
        const [statusDist] = await sql.query("SELECT status, COUNT(*) as count FROM repair_jobs GROUP BY status");

        res.json({
            success: true,
            data: {
                totalIncome,
                activeJobs,
                carsThisMonth,
                statusDistribution: statusDist
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// Get Monthly Income (for Bar Chart)
exports.getMonthlyIncome = async (req, res) => {
    try {
        const [rows] = await sql.query(`
            SELECT DATE_FORMAT(completion_date, '%Y-%m') as month, SUM(final_cost) as total
            FROM repair_jobs 
            WHERE status = 'completed' 
            GROUP BY month 
            ORDER BY month DESC 
            LIMIT 6
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
