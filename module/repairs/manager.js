const { promisePool: sql } = require('../sql/mysql');

// Create Repair Job (Admin/Mechanic)
exports.createJob = async (req, res) => {
    const { car_id, mechanic_id, description, estimated_cost } = req.body;
    try {
        await sql.query(
            'INSERT INTO repair_jobs (car_id, mechanic_id, description, estimated_cost, status) VALUES (?, ?, ?, ?, "pending")',
            [car_id, mechanic_id, description, estimated_cost]
        );
        res.json({ success: true, msg: 'Job created' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Database error' });
    }
};

// Update Job Status
exports.updateStatus = async (req, res) => {
    const { job_id, status } = req.body;
    try {
        await sql.query('UPDATE repair_jobs SET status = ? WHERE id = ?', [status, job_id]);

        // If completed, set completion date
        if (status === 'completed') {
            await sql.query('UPDATE repair_jobs SET completion_date = NOW() WHERE id = ?', [job_id]);
        }

        res.json({ success: true, msg: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Database error' });
    }
};

// Get Job Details
exports.getJobDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const [jobs] = await sql.query(`
            SELECT j.*, c.license_plate, c.brand, c.model, u.username as mechanic_name 
            FROM repair_jobs j
            JOIN cars c ON j.car_id = c.id
            LEFT JOIN users u ON j.mechanic_id = u.id
            WHERE j.id = ?
        `, [id]);

        if (jobs.length === 0) return res.json({ success: false, error: 'Not found' });

        res.json({ success: true, job: jobs[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
