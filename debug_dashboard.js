const { getDashboardStats } = require('./module/admin/dashboardController');
const { promisePool } = require('./module/sql/mysql');

(async () => {
    try {
        console.log('Running getDashboardStats...');
        const stats = await getDashboardStats();
        console.log('Success!', JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error('Failed:', error);
    } finally {
        promisePool.pool.end();
    }
})();
