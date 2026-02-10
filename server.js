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
const { getCustomers, addCustomer, exportCustomers, getCustomerById, editCustomer } = require('./module/admin/customerController')
const { getCars, addCar, searchOwners, getCarById, editCar, exportCars } = require('./module/admin/carController')
const { getInventory, addItem, updateItem, deleteItem } = require('./module/admin/inventoryController')
const { runMigrations } = require('./module/migrations/migration')
const multer = require('multer')
const fs = require('fs')

// Configure Multer
// Configure Multer for Cars
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './public/uploads/cars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) // Append extension
  }
})
const upload = multer({ storage: storage })

// Configure Multer for Inventory
const storageInventory = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './public/uploads/inventory';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})
const uploadInventory = multer({ storage: storageInventory })

// --- API --- //
app.get('/admin/api/owners', requireAuth, requireAdmin, async (req, res) => {
  const results = await searchOwners(req.query.q);
  res.json(results);
});

app.get('/admin/api/cars/:id', requireAuth, requireAdmin, async (req, res) => {
  const car = await getCarById(req.params.id);
  if (car) res.json(car);
  else res.status(404).send('Car not found');
});

app.get('/admin/api/customers/:id', requireAuth, requireAdmin, async (req, res) => {
  const customer = await getCustomerById(req.params.id);
  if (customer) res.json(customer);
  else res.status(404).send('Customer not found');
});

// --- CUSTOMERS --- //
app.post('/admin/customers/add', requireAuth, requireAdmin, async (req, res) => {
  const result = await addCustomer(req.body);
  if (result.success) {
    res.redirect('/admin/customers');
  } else {
    console.log('Error adding customer:', result.error);
    res.redirect('/admin/customers?error=' + encodeURIComponent(result.error));
  }
})

app.post('/admin/customers/edit/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await editCustomer(req.params.id, req.body);
  if (result.success) {
    res.redirect('/admin/customers');
  } else {
    console.log('Error editing customer:', result.error);
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

// --- CARS --- //
app.get('/admin/cars/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || '';
    const csvData = await exportCars(search);

    const bom = '\ufeff';
    const csvContent = bom + csvData;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=cars.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting cars:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
  }
})

app.get('/admin/cars', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const data = await getCars(page, limit, search, status);

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('admin/cars', {
      user: userView,
      path: '/admin/cars',
      cars: data.cars,
      pagination: data.pagination
    });
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลรถยนต์');
  }
})

app.post('/admin/cars/add', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  const result = await addCar(req.body, req.file);
  if (result.success) {
    res.redirect('/admin/cars');
  } else {
    res.redirect('/admin/cars?error=' + encodeURIComponent(result.error));
  }
})

app.post('/admin/cars/edit/:id', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  const result = await editCar(req.params.id, req.body, req.file);
  if (result.success) {
    res.redirect('/admin/cars');
  } else {
    res.redirect('/admin/cars?error=' + encodeURIComponent(result.error));
  }
})

// --- INVENTORY --- //
app.get('/admin/inventory', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';

    const data = await getInventory(page, limit, search, filter);

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('admin/inventory', {
      user: userView,
      path: '/admin/inventory',
      items: data.items,
      pagination: data.pagination,
      stats: data.stats,
      search,
      filter
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลคลังสินค้า');
  }
})

app.post('/admin/inventory/add', requireAuth, requireAdmin, uploadInventory.single('image'), async (req, res) => {
  const result = await addItem(req.body, req.file);
  if (result.success) {
    res.redirect('/admin/inventory');
  } else {
    res.redirect('/admin/inventory?error=' + encodeURIComponent(result.error));
  }
})

// ============== PORT =============== //
app.listen(port, '0.0.0.0', async () => {
  console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
  await runMigrations();
})