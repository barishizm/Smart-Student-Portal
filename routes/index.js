const express = require('express');
const router = express.Router();
const db = require('../models/db');

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

router.get('/profile', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }

    db.get('SELECT id, username, email, role, avatar_url, first_name, last_name, preferred_language FROM users WHERE id = ?', [req.session.user.id], (err, row) => {
        if (err || !row) {
            req.flash('error_msg', 'Could not load profile details');
            return res.redirect('/dashboard');
        }

        req.session.user.username = row.username;
        req.session.user.email = row.email || null;
        req.session.user.avatar_url = row.avatar_url || null;
        req.session.user.first_name = row.first_name || null;
        req.session.user.last_name = row.last_name || null;
        req.session.user.role = row.role || req.session.user.role;
        req.session.user.preferred_language = row.preferred_language || req.session.user.preferred_language || 'en';
        req.session.preferred_language = req.session.user.preferred_language;

        return res.render('profile', { user: req.session.user });
    });
});

router.get('/about', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }
    res.render('about', { user: req.session.user });
});

router.get('/contact', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }
    res.render('contact', { user: req.session.user });
});

module.exports = router;
