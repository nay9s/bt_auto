const express = require('express');
const app = express();
const port = 3000;
const session = require('express-session')
const { requireAuth } = require('./module/auth/requireAuth')
const path = require('path');

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.set('views' , './views');
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
app.get('/',(req,res)=>{
    res.render('index')
})

// ==============  HOME  =============== //
app.get('/home', requireAuth ,(req,res)=>{
    res.render('home', { user: req.session.user })
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
app.get('/login',(req,res)=>{
    res.render('login',{ error: null })
})

app.post('/login', login)
app.post('/logout', logout)

// ============== PORT =============== //
app.listen(port, '0.0.0.0' ,()=>{
    console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
})