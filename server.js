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

app.get('/car-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    // Fetch all work orders for the user, ordered by date
    // We want to show the *latest* status for each car, or just list all active repairs.
    // Let's list all active repairs + recently completed ones.
    const [orders] = await sql.query(`
            SELECT 
                wo.id AS work_order_id,
                wo.service_type,
                wo.description,
                wo.status,
                wo.appointment_date,
                wo.created_at,
                wo.updated_at,
                wo.end_date,
                c.brand,
                c.model,
                c.year,
                c.license_plate,
                c.image_url
            FROM work_orders wo
            JOIN cars c ON wo.car_id = c.id
            WHERE c.user_id = ?
            ORDER BY wo.updated_at DESC, wo.created_at DESC
        `, [userId]);

    const statusSteps = ['pending', 'checking', 'waiting_parts', 'repairing', 'repair_done', 'ready_for_pickup'];

    const formattedOrders = await Promise.all(orders.map(async (order) => {
      // Determine active step index
      let activeStepIndex = 0;
      switch (order.status) {
        case 'pending': activeStepIndex = 0; break;
        case 'checking': activeStepIndex = 1; break;
        case 'waiting_parts': activeStepIndex = 2; break;
        case 'repairing': activeStepIndex = 3; break;
        case 'ready_for_pickup': activeStepIndex = 5; break;
        case 'completed': activeStepIndex = 6; break;
        default: activeStepIndex = 0;
      }

      // Fetch History Logs
      const [historyLogs] = await sql.query(`
          SELECT status, created_at 
          FROM work_order_history 
          WHERE work_order_id = ? 
          ORDER BY created_at ASC
      `, [order.work_order_id]);

      // Map history dates to steps
      const stepsDates = {};
      historyLogs.forEach(log => {
        // Format date: "10 Feb 2024" or similar
        const dateStr = new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        const timeStr = new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const fullDate = `${dateStr} ${timeStr}`;

        // Map status to step index/key
        // 0: pending, 1: checking, 2: waiting_parts, 3: repairing, 5: ready_for_pickup
        // Note: 'completed' not shown in timeline usually, but if it is, it's step 6
        if (log.status === 'pending') stepsDates[0] = fullDate;
        if (log.status === 'checking') stepsDates[1] = fullDate;
        if (log.status === 'waiting_parts') stepsDates[2] = fullDate;
        if (log.status === 'repairing') stepsDates[3] = fullDate;
        // Step 4 is "Repair Done" (implied by ready_for_pickup start?) -> Let's use repairing end or just skip for now
        // Actually, if we have ready_for_pickup, that's step 5. 
        if (log.status === 'ready_for_pickup') stepsDates[5] = fullDate;
        if (log.status === 'completed') stepsDates[6] = fullDate;
      });

      // Special case: If created_at exists in order, use it for step 0 if not in history (for old orders)
      if (!stepsDates[0] && order.created_at) {
        stepsDates[0] = new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      }

      return {
        ...order,
        activeStepIndex,
        stepsDates, // Pass dates to view
        formattedDate: order.appointment_date ? new Date(order.appointment_date).toLocaleDateString('th-TH') : '-',
        formattedEndDate: order.end_date ? new Date(order.end_date).toLocaleDateString('th-TH') : '-'
      };
    }));

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('user/car-status', {
      user: userView,
      path: '/car-status',
      orders: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching car status:', error);
    res.status(500).send('Server Error');
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

app.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    // Fetch all completed work orders for the user
    const [historyItems] = await sql.query(`
        SELECT 
            wo.id AS work_order_id,
            wo.service_type,
            wo.description,
            wo.status,
            wo.appointment_date,
            wo.cost,
            c.brand,
            c.model,
            c.license_plate,
            c.year
        FROM work_orders wo
        JOIN cars c ON wo.car_id = c.id
        WHERE c.user_id = ?
        ORDER BY wo.appointment_date DESC, wo.created_at DESC
    `, [userId]);

    // Fetch items for each history entry (optional, but good for details)
    // For now, we'll just show the main info. If we want details, we can do a loop or join.
    // Let's attach items to each order for the detailed view in history.ejs
    for (const item of historyItems) {
      const [orderItems] = await sql.query(`
            SELECT item_name, quantity, unit_price FROM work_order_items WHERE work_order_id = ?
         `, [item.work_order_id]);
      item.items = orderItems;
    }

    const formattedHistory = historyItems.map(item => ({
      ...item,
      formattedDate: item.appointment_date ? new Date(item.appointment_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
      formattedCost: new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 0 }).format(item.cost || 0)
    }));

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('user/history', {
      user: userView,
      path: '/history',
      history: formattedHistory
    })
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).send('Error fetching history');
  }
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
const { getCustomers, addCustomer, exportCustomers, getCustomerById, editCustomer, deleteCustomer } = require('./module/admin/customerController')
const { getCars, addCar, searchOwners, getCarById, editCar, exportCars, deleteCar } = require('./module/admin/carController')
const { getInventory, addItem, updateItem, deleteItem } = require('./module/admin/inventoryController')
const { getWorkOrders, getWorkOrderById, createWorkOrder, getUsersForDropdown, getCarsByUserId, updateWorkOrder, deleteWorkOrder } = require('./module/admin/workOrderController')
const { getFinanceData } = require('./module/admin/financeController')
const { runMigrations } = require('./module/migrations/migration')
const multer = require('multer')
const fs = require('fs')

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
    cb(null, Date.now() + path.extname(file.originalname))
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

// Delete Customer
app.get('/admin/customers/delete/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await deleteCustomer(req.params.id);
  if (result.success) {
    res.redirect('/admin/customers');
  } else {
    res.redirect('/admin/customers?error=' + encodeURIComponent(result.error));
  }
});

app.post('/admin/cars/edit/:id', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  const result = await editCar(req.params.id, req.body, req.file);
  if (result.success) {
    res.redirect('/admin/cars');
  } else {
    res.redirect('/admin/cars?error=' + encodeURIComponent(result.error));
  }
})

// Delete Car
app.get('/admin/cars/delete/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await deleteCar(req.params.id);
  if (result.success) {
    res.redirect('/admin/cars');
  } else {
    res.redirect('/admin/cars?error=' + encodeURIComponent(result.error));
  }
});

// Admin Redirect
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.redirect('/admin/work-orders');
});

// Configure Multer
// ... (omitted)

// (Skipping to routes)

// Update Work Order
app.post('/admin/work-orders/update/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const items = JSON.parse(req.body.itemsJson || '[]');
    const result = await updateWorkOrder(req.params.id, {
      ...req.body,
      items
    });

    if (result.success) {
      res.redirect('/admin/work-orders');
    } else {
      res.status(500).send('Error updating work order: ' + result.error);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Delete Work Order
app.get('/admin/work-orders/delete/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await deleteWorkOrder(req.params.id);
  if (result.success) {
    res.redirect('/admin/work-orders');
  } else {
    res.redirect('/admin/work-orders?error=' + encodeURIComponent(result.error));
  }
});



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

app.post('/admin/inventory/edit/:id', requireAuth, requireAdmin, uploadInventory.single('image'), async (req, res) => {
  const result = await updateItem(req.params.id, req.body, req.file);
  if (result.success) {
    res.redirect('/admin/inventory');
  } else {
    res.redirect('/admin/inventory?error=' + encodeURIComponent(result.error));
  }
})

app.post('/admin/inventory/restock/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await require('./module/admin/inventoryController').restockItem(req.params.id, req.body.quantity);
  if (result.success) {
    res.redirect('/admin/inventory');
  } else {
    res.redirect('/admin/inventory?error=' + encodeURIComponent(result.error));
  }
})

app.get('/admin/api/inventory/:id', requireAuth, requireAdmin, async (req, res) => {
  const item = await require('./module/admin/inventoryController').getItemById(req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'Item not found' });
});

// --- WORK ORDERS --- //
app.get('/admin/work-orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const data = await getWorkOrders(page, limit, search, status);
    const users = await getUsersForDropdown();

    // Get inventory items for the dropdown in modal
    const inventoryData = await getInventory(1, 1000, '', ''); // Fetch all (limited to 1000)

    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('admin/work-orders', {
      user: userView,
      path: '/admin/work-orders',
      workOrders: data.workOrders,
      pagination: data.pagination,
      users: users,
      inventoryItems: inventoryData.items,
      search,
      status
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งซ่อม');
  }
})

app.post('/admin/work-orders/create', requireAuth, requireAdmin, async (req, res) => {
  // Parse numeric values from form
  const rawItems = req.body.items || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems]; // Handle single item case if needed, but normally it's JSON from frontend or array

  // Note: Since we will likely use client-side JS to build the JSON object for items, 
  // we might want to accept a JSON string for 'items' or handle traditional form array inputs.
  // For this implementation, let's assume the frontend sends a structured JSON string in a hidden field 'itemsJson'
  // OR we parse traditional form data. Let's start with a simpler approach: receiving JSON body fits better for complex nested data.
  // However, standard form submission sends form-urlencoded.
  // Let's rely on a hidden input 'itemsJson' which contains the array of items.

  let parsedItems = [];
  if (req.body.itemsJson) {
    try {
      parsedItems = JSON.parse(req.body.itemsJson);
    } catch (e) {
      console.error('Error parsing items JSON', e);
    }
  }

  const workOrderData = {
    car_id: req.body.car_id,
    service_type: req.body.service_type,
    description: req.body.description,
    status: req.body.status,
    appointment_date: req.body.appointment_date,
    items: parsedItems
  };

  const result = await createWorkOrder(workOrderData);
  if (result.success) {
    res.redirect('/admin/work-orders');
  } else {
    res.redirect('/admin/work-orders?error=' + encodeURIComponent(result.error));
  }
})

// API to get work order details for editing
app.get('/admin/api/work-orders/:id', requireAuth, requireAdmin, async (req, res) => {
  console.log(`[API] Request for WO details ID: ${req.params.id}`); // DEBUG
  try {
    const workOrder = await getWorkOrderById(req.params.id);
    if (!workOrder) {
      console.log(`[API] WO ID ${req.params.id} not found`); // DEBUG
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(workOrder);
  } catch (error) {
    console.error(`[API] Error fetching WO ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update Work Order
app.post('/admin/work-orders/update/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const items = JSON.parse(req.body.itemsJson || '[]');
    const result = await updateWorkOrder(req.params.id, {
      ...req.body,
      items
    });

    if (result.success) {
      res.redirect('/admin/work-orders');
    } else {
      res.status(500).send('Error updating work order: ' + result.error);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Delete Work Order
app.get('/admin/work-orders/delete/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await deleteWorkOrder(req.params.id);
  if (result.success) {
    res.redirect('/admin/work-orders');
  } else {
    res.redirect('/admin/work-orders?error=' + encodeURIComponent(result.error));
  }
});

// API to get cars by user id
app.get('/admin/api/users/:id/cars', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getCarsByUserId } = require('./module/admin/workOrderController');
    const userCars = await getCarsByUserId(req.params.id);
    res.json(userCars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// --- FINANCE --- //
app.get('/admin/finance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userSession = req.session.user;
    const userView = {
      ...userSession,
      firstName: userSession.first_name || userSession.firstName,
      lastName: userSession.last_name || userSession.lastName,
      roles: userSession.role || userSession.roles
    };

    res.render('admin/finance', {
      user: userView,
      path: '/admin/finance'
    });
  } catch (error) {
    console.error('Error rendering finance page:', error);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

app.get('/admin/api/finance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const data = await getFinanceData(period);
    res.json(data);
  } catch (error) {
    console.error('Error fetching finance data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ============== PORT =============== //
app.listen(port, '0.0.0.0', async () => {
  console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
  await runMigrations();
})