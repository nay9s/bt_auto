const mysql = require('mysql2');
require('dotenv').config({ path: '.env' })

const pool = mysql.createPool({
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME,
    port : process.env.DB_PORT
})
module.exports = {
    //ใช้ Callback function เหมือนเดิม
    pool : pool,
    //ใช้ Promise / async-await
    promisePool : pool.promise()
};