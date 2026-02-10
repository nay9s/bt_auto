function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Check if roles array includes 'admin'
    // Note: session.user.roles is likely an array of strings like ['user', 'admin']
    // If it's not an array, handling might be needed, but login.js sets it as array.
    const roles = req.session.user.roles || [];
    if (roles.includes('admin')) {
        next();
    } else {
        // Unauthorized access - could redirect to home or show 403
        console.log(`Unauthorized admin access attempt by user: ${req.session.user.username}`);
        return res.redirect('/home');
    }
}

module.exports = { requireAdmin };
