const session = require('express-session')

module.exports = async function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      console.error(err)
      return res.redirect('/home')
    }
    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
}
