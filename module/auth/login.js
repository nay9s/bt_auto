const { promisePool: sql } = require('../sql/mysql');
const bcrypt = require('bcrypt');

module.exports = async function login(req,res) {
    const {username , password} = req.body
    try{
        const [users] = await sql.query('SELECT id, username , password_hash FROM users WHERE username = ? or email = ?', [username, username])
        if(users.length < 1){
            return res.json({success : false , error : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง .'})
        }

        const user = users[0]
        console.log(user.password_hash)
    
        const ValidPass = await bcrypt.compare(password,user.password_hash)
        if(!ValidPass){
            return res.json({success: false, error : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'})
        }

        return res.json({success:true,msg:'เข้าสู่ระบบสำเร็จ'})
    }catch(err){
        console.error(err);
        return res.json({success:false , error : 'Server เกิดข้อผิดพลาด'})
    }

}