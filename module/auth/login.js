const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

module.exports = async function login(req, res) {
    const { username, password } = req.body
    try {
        const [users] = await sql.query('SELECT id, username, email, first_name, last_name, password_hash FROM users WHERE username = ? or email = ?', [username, username])
<<<<<<< HEAD
        if (users.length < 1) {
            return res.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง .' })
=======
        if(users.length < 1){
            return res.render('login', {
                error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
>>>>>>> 7e53f9b3c27a2f3343304002f65707ee16780f98
        }

        const user = users[0]

<<<<<<< HEAD
        const ValidPass = await bcrypt.compare(password, user.password_hash)
        if (!ValidPass) {
            return res.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
=======
        const ValidPass = await bcrypt.compare(password,user.password_hash)
        if(!ValidPass){
            return res.render('login', {
                error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
>>>>>>> 7e53f9b3c27a2f3343304002f65707ee16780f98
        }

        //u = username // ur = user_roles // r = roles
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
            roles: roles.map(r => r.name)
        }

<<<<<<< HEAD
        return res.json({ success: true, msg: 'เข้าสู่ระบบสำเร็จ' })

    } catch (err) {
        console.error(err);
        return res.json({ success: false, error: 'Server เกิดข้อผิดพลาด' })
=======
        return res.redirect('/home');
        
    }catch(err){
        console.error(err);
        return res.render('login', {
            error: 'server เกิดข้อผิดพลาด'
        });
>>>>>>> 7e53f9b3c27a2f3343304002f65707ee16780f98
    }

}