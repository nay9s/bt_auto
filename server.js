const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session')
const { requireAuth } = require('./module/auth/requireAuth')
const path = require('path');

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
<<<<<<< HEAD
app.set('views', './views');
=======
app.use(express.static(path.join(__dirname, 'public')));
app.set('views' , './views');
>>>>>>> 7e53f9b3c27a2f3343304002f65707ee16780f98
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
<<<<<<< HEAD
app.get('/login', (req, res) => {
  res.render('login')
=======
app.get('/login',(req,res)=>{
    res.render('login',{ error: null })
>>>>>>> 7e53f9b3c27a2f3343304002f65707ee16780f98
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

app.get('/admin/dashboard', requireAuth, (req, res) => {
  res.render('admin_dashboard', { user: req.session.user });
});

app.get('/admin/repairs', requireAuth, (req, res) => {
  res.render('manage_repairs', { user: req.session.user });
});


// ============== PORT =============== //
app.listen(port, '0.0.0.0', () => {
  console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
})