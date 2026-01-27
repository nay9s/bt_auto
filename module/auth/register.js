const bcrypt = require('bcrypt')

//เรียกใช้ promisePool แต่ตั้งชื่อว่า sql
const { promisePool: sql } = require('../sql/mysql');
const passwordCheck = (password, confirmPassword) => {
  if (password.length < 8) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  }

  if (!/[a-z]/.test(password)) {
    return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก'
  }

  if (!/[A-Z]/.test(password)) {
    return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่'
  }

  if (!/[0-9]/.test(password)) {
    return 'รหัสผ่านต้องมีตัวเลข'
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'รหัสผ่านต้องมีอักขระพิเศษ'
  }

  if (/\s/.test(password)) {
    return 'รหัสผ่านห้ามมีช่องว่าง'
  }

  if (confirmPassword === null) {
    return 'กรุณากรอกรหัสผ่านยืนยัน'
  }

  if (confirmPassword != password) {
    return 'รหัสผ่านไม่ตรงกัน'
  }

  return null
}


module.exports = async function register(req, res) {
  const { username, password, confirmPassword, email, firstname, lastname, phone } = req.body
  if (!username || !password || !email || !firstname || !lastname || !confirmPassword || !phone) {
    return res.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  try {
    const hashPassword = await bcrypt.hash(password, 10)
    const [users] = await sql.query(
      'SELECT username , email FROM users WHERE username = ? OR email = ?', [username, email]
    )

    if (users.length > 0) {
      if (users[0].email == email && users[0].username == username) {
        return res.json({ success: false, error: 'คุณมีบัญชีอยู่แล้ว' });
      } else if (users[0].username == username) {
        return res.json({ success: false, error: 'ชื่อถูกใช้งานแล้ว' });
      } else if (users[0].email == email) {
        return res.json({ success: false, error: 'Email นี้มีผู้ใช้งานแล้ว' });
      }
    }

    const BadPassword = passwordCheck(password, confirmPassword)
    if (BadPassword) {
      return res.json({ success: false, error: BadPassword })
    }

    const [insertResult] = await sql.query(
      'INSERT INTO users (username, password_hash, email, first_name, last_name , phone) VALUES (?, ?, ?, ?, ? , ?)',
      [username, hashPassword, email, firstname, lastname, phone]
    )

    // console.log(insertResult);
    const userID = insertResult.insertId

    await sql.query(
      "INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name = 'ผู้ใช้'",
      [userID]
    )
    return res.json({ success: true, msg: 'สมัครสมาชิกสำเร็จ!' });

  } catch (err) {
    console.error(err)
    return res.json({ success: false, error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
}