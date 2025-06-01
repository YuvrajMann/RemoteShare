const { PIN_CODE, AUTH_COOKIE_NAME } = require('../config/auth');

function authMiddleware(req, res, next) {
    if (req.path === '/auth' || req.path === '/verify-pin') {
        return next();
    }

    const authCookie = req.cookies[AUTH_COOKIE_NAME];
    
    if (!authCookie || authCookie !== PIN_CODE) {
        return res.redirect('/auth');
    }
    
    next();
}

module.exports = authMiddleware;