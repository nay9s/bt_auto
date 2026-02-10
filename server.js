const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session')
const { requireAuth } = require('./module/auth/requireAuth')
const { redirectIfAuth } = require('./module/auth/redirectIfAuth')
const path = require('path');

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.set('view engine', 'ejs')

app.use(session({
  secret: 'carcareservice',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}))


// ==============  INDEX  =============== //
app.get('/', (req, res) => {
  res.render('index')
})

// ==============  HOME  =============== //
const { promisePool: sql } = require('./module/sql/mysql');
app.get('/home', requireAuth, async (req, res) => {
  try {
    // ดึง userId จาก session (ตรวจสอบว่าตอน login เก็บ user.id ไว้ด้วย)
    const userId = req.session.user.id;
    // Query ข้อมูลงานซ่อมและข้อมูลรถของ User คนนี้
    const [workOrders] = await sql.query(`
            SELECT 
                wo.id AS work_order_id,
                wo.service_type,
                wo.description,
                wo.status,
                wo.appointment_date,
                wo.created_at,
                c.brand,
                c.model,
                c.year,
                c.license_plate,
                c.image_url
            FROM work_orders wo
            JOIN cars c ON wo.car_id = c.id
            WHERE c.user_id = ? AND wo.status != 'completed'
            ORDER BY wo.appointment_date DESC, wo.created_at DESC
        `, [userId]);

    // Query 2 latest history items
    // Query 2 latest completed work orders for history
    const [historyItems] = await sql.query(`
        SELECT wo.service_type, wo.appointment_date AS service_date
        FROM work_orders wo
        JOIN cars c ON wo.car_id = c.id
        WHERE c.user_id = ?
        ORDER BY wo.appointment_date DESC, wo.created_at DESC
        LIMIT 2
    `, [userId]);

    // Prepare data for view
    const statusTranslation = {
      'pending': 'รอดำเนินการ',
      'checking': 'กำลังตรวจเช็ค',
      'repairing': 'กำลังซ่อมแซม',
      'completed': 'ซ่อมเสร็จสิ้น',
      'ready_for_pickup': 'รอรับรถ'
    };

    const formattedWorkOrders = workOrders.map(order => ({
      ...order,
      statusTh: statusTranslation[order.status] || order.status,
      formattedDate: order.appointment_date ? new Date(order.appointment_date).toLocaleDateString('th-TH') : 'ไม่ระบุ'
    }));

    // Check user object and ensure properties exist (fixing firstName vs first_name mismatch)
    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles // Handle potential role property mismatch
    };

    // ส่งข้อมูลไปที่หน้า home.ejs
    res.render('user/home', {
      user: userView,
      path: '/home',
      workOrders: formattedWorkOrders,
      history: historyItems
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});

app.get('/add-car', requireAuth, (req, res) => {
  res.render('user/add-car', { user: req.session.user, path: '/add-car' })
})

app.post('/add-car', requireAuth, (req, res) => {
  console.log('Added car:', req.body)
  res.redirect('user/home')
})

app.get('/car-details', requireAuth, async (req, res) => {
  const workOrderId = req.query.id;
  const userId = req.session.user.id; // Security check to ensure user owns the order

  if (!workOrderId) {
    return res.redirect('/home');
  }

  try {
    const [rows] = await sql.query(`
            SELECT 
                wo.id AS work_order_id,
                wo.service_type,
                wo.description,
                wo.status,
                wo.appointment_date,
                wo.start_date,
                wo.end_date,
                wo.cost,
                c.brand,
                c.model,
                c.year,
                c.license_plate,
                c.image_url
            FROM work_orders wo
            JOIN cars c ON wo.car_id = c.id
            WHERE wo.id = ? AND c.user_id = ?
        `, [workOrderId, userId]);

    if (rows.length === 0) {
      return res.redirect('/home'); // Not found or unauthorized
    }

    const order = rows[0];

    // Prepare data for view
    const statusTranslation = {
      'pending': 'รอดำเนินการ',
      'checking': 'กำลังตรวจเช็ค',
      'repairing': 'กำลังซ่อมแซม',
      'completed': 'ซ่อมเสร็จสิ้น',
      'ready_for_pickup': 'รอรับรถ'
    };

    const formattedOrder = {
      ...order,
      statusTh: statusTranslation[order.status] || order.status,
      formattedDate: order.appointment_date ? new Date(order.appointment_date).toLocaleDateString('th-TH') : 'ไม่ระบุ',
      formattedCost: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(order.cost || 0)
    };

    // Ensure user object has correct properties
    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };


    res.render('user/car-details', {
      user: userView,
      path: '/car-details',
      order: formattedOrder
    });

  } catch (error) {
    console.error('Error fetching car details:', error);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
})

app.get('/history', requireAuth, (req, res) => {
  res.render('user/history', { user: req.session.user, path: '/history' })
})

app.get('/car-status', requireAuth, (req, res) => {
  res.render('user/car-status', { user: req.session.user, path: '/car-status' })
})

app.get('/contact', requireAuth, (req, res) => {
  res.render('user/contact', { user: req.session.user, path: '/contact' })
})

// ==============  REGISTER  =============== //
const register = require('./module/auth/register')
app.get('/register', redirectIfAuth, (req, res) => {
  res.render('register', { error: null, msg: null })
})

app.post('/register', register)

// ==============  LOGIN && LOGOUT =============== //
const login = require('./module/auth/login')
const logout = require('./module/auth/logout')
app.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', { error: null })
})

app.post('/login', login)
app.get('/logout', logout)

// ==============  ADMIN  =============== //
const { requireAdmin } = require('./module/auth/requireAdmin')
const { getCustomers, addCustomer, exportCustomers } = require('./module/admin/customerController')

app.post('/admin/customers/add', requireAuth, requireAdmin, async (req, res) => {
  const result = await addCustomer(req.body);
  if (result.success) {
    res.redirect('/admin/customers');
  } else {
    // In a real app, you'd flash this error or send it back to the view
    // For now, simpler handling or query param error
    console.log('Error adding customer:', result.error);
    res.redirect('/admin/customers?error=' + encodeURIComponent(result.error));
  }
})

app.get('/admin/customers/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || '';
    const csvData = await exportCustomers(search);

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\ufeff';
    const csvContent = bom + csvData;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
  }
})

app.get('/admin/customers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';

    const data = await getCustomers(page, limit, search);

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('admin/customers', {
      user: userView,
      path: '/admin/customers',
      customers: data.customers,
      pagination: data.pagination
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า');
  }
})

// ============== PORT =============== //
app.listen(port, '0.0.0.0', () => {
  console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
})