const express = require('express');
const router = express.Router();

// Login Page (Home)
router.get('/', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// Dashboard (Protected)
router.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }
    // Mock data for dashboard if needed, or pass user info
    res.render('dashboard', { user: req.session.user });
});

module.exports = router;
