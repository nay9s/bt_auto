const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

module.exports = async function login(req,res) {
    const {username , password} = req.body
    try{
        const [users] = await sql.query('SELECT id, username, email, first_name, last_name, password_hash FROM users WHERE username = ? or email = ?', [username, username])
        if(users.length < 1){
            return res.render('login', {
                error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const user = users[0]

        const ValidPass = await bcrypt.compare(password,user.password_hash)
        if(!ValidPass){
            return res.render('login', {
                error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const [roles] = await sql.query(
            `SELECT ur.role_id, r.name
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = ?
            `,
            [user.id]
        )

        if (roles.length < 1) {
            return res.render('login', {
                error: 'ผู้ใช้ยังไม่มี Role'
            });
        }

        console.log(`${roles.map(r => r.name)}`)

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roles: roles.map(r => r.role_name)
        }

        return res.redirect('/home');
        
    }catch(err){
        console.error(err);
        return res.render('login', {
            error: 'server เกิดข้อผิดพลาด'
        });
    }

}