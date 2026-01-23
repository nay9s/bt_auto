const { promisePool: sql } = require('../sql/mysql');

// Add a new Car
exports.addCar = async (req, res) => {
    const { license_plate, brand, model, year, color } = req.body;
    const userId = req.session.user.id; // From logged in user

    if (!license_plate || !brand || !model) {
        return res.json({ success: false, error: 'Please fill in required fields' });
    }

    try {
        await sql.query(
            'INSERT INTO cars (user_id, license_plate, brand, model, year, color) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, license_plate, brand, model, year, color]
        );
        res.json({ success: true, msg: 'Car added successfully' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Failed to add car (Duplicate license plate?)' });
    }
};

// Get My Cars
exports.getMyCars = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [cars] = await sql.query('SELECT * FROM cars WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        // Also fetch active repair status for each car if needed
        res.json({ success: true, cars });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// Search Car (Global - for Admin/Mechanic)
exports.searchCar = async (req, res) => {
    const { query } = req.query;
    try {
        const [cars] = await sql.query('SELECT * FROM cars WHERE license_plate LIKE ? OR brand LIKE ?', [`%${query}%`, `%${query}%`]);
        res.json({ success: true, cars });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
