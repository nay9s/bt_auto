function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const roles = req.session.user.roles || [];
    if (roles.includes('admin')) {
        next();
    } else {
        console.log(`Unauthorized admin access attempt by user: ${req.session.user.username}`);
        return res.redirect('/home');
    }
}

module.exports = { requireAdmin };
