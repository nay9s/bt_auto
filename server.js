const express = require('express');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.set('views' , './views');
app.set('view engine', 'ejs')


// ==============  INDEX  =============== //
app.get('/',(req,res)=>{
    res.render('index')
})

// ==============  REGISTER  =============== //
const register = require('./module/auth/register')
app.get('/register', (req, res) => {
  res.render('register', { error: null, msg: null })
})

app.post('/register', register)



// ============== PORT =============== //
app.listen(port, '0.0.0.0' ,()=>{
    console.log(`This server running on port : ${port} \nRunning http://localhost:${port}`)
})