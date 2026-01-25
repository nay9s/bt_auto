const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session')
const { requireAuth } = require('./module/auth/requireAuth')
const path = require('path');

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.set('view engine', 'ejs')

app.use(session({

  secret: 'abc',
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
app.get('/home', requireAuth, (req, res) => {
  res.render('home', { user: req.session.user })
})

app.get('/reviewhome', (req, res) => {
  res.render('reviewhome', { user: req.session.user })
})

// ==============  REGISTER  =============== //
const register = require('./module/auth/register')
app.get('/register', (req, res) => {
  res.render('register', { error: null, msg: null })
})

app.post('/register', register)

// ==============  LOGIN && LOGOUT =============== //
const login = require('./module/auth/login')
const logout = require('./module/auth/logout')
app.get('/login', (req, res) => {
  res.render('login', { error: null })
})

app.post('/login', login)
app.post('/logout', logout)

// ==============  MODULES  =============== //
const carManager = require('./module/cars/manager');
const repairManager = require('./module/repairs/manager');
const dashboardAdmin = require('./module/dashboard/admin');

// Cars
app.post('/api/cars/add', requireAuth, carManager.addCar);
app.get('/api/cars/my', requireAuth, carManager.getMyCars);

// Repairs
app.post('/api/jobs/create', requireAuth, repairManager.createJob); // Need admin check in real app
app.post('/api/jobs/status', requireAuth, repairManager.updateStatus);
app.get('/api/jobs/:id', requireAuth, repairManager.getJobDetails);

// Dashboard Data
app.get('/api/dashboard/stats', requireAuth, dashboardAdmin.getStats);

// Views for these features
app.get('/my-cars', requireAuth, (req, res) => {
  res.render('my_cars', { user: req.session.user });
});

// ADMIN ROUTES
app.get('/admin/dashboard', requireAuth, (req, res) => {
  res.render('admin/dashboard', { user: req.session.user, page: 'dashboard' });
});

app.get('/admin/finance', requireAuth, (req, res) => {
  res.render('admin/finance', { user: req.session.user, page: 'finance' });
});

app.get('/admin/cars', requireAuth, (req, res) => {
  res.render('admin/cars', { user: req.session.user, page: 'cars' });
});

app.get('/admin/customers', requireAuth, (req, res) => {
  res.render('admin/customers', { user: req.session.user, page: 'customers' });
});

app.get('/admin/repairs', requireAuth, (req, res) => {
  res.render('admin/repairs', { user: req.session.user, page: 'repairs' });
});

app.get('/admin/inventory', requireAuth, (req, res) => {
  res.render('admin/inventory', { user: req.session.user, page: 'inventory' });
});


// ============== PORT =============== //
app.listen(port, '0.0.0.0', () => {
  console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
})