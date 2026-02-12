const db = require('../models/db');
const bcrypt = require('bcrypt');
const { isAdminIdentity, getEffectiveRole } = require('../config/auth');

const dbGet = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });

const dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });

const renderRegisterWithErrors = (res, errors, username, email) => {
    return res.status(400).render('register', {
        errors,
        username,
        email,
        error_msg: errors.map((err) => err.msg).join('<br>')
    });
};

exports.registerPage = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register');
};

exports.register = async (req, res) => {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirm_password || '';
    let errors = [];

    if (!username || !email || !password || !confirmPassword) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password && confirmPassword && password !== confirmPassword) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password && password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (isAdminIdentity({ username, email })) {
        errors.push({ msg: 'This identity is reserved for the system administrator' });
    }

    if (errors.length > 0) {
        return renderRegisterWithErrors(res, errors, username, email);
    }

    try {
        const existingUser = await dbGet(
            'SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)',
            [email, username]
        );

        if (existingUser) {
            if (existingUser.email === email) {
                errors.push({ msg: 'Email already exists' });
            }
            if (existingUser.username === username) {
                errors.push({ msg: 'Username already exists' });
            }
            return renderRegisterWithErrors(res, errors, username, email);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await dbRun(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, 'student']
        );

        req.flash('success_msg', 'You are now registered and can log in');
        return res.redirect('/');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            const message = err.message || '';
            if (message.includes('users.email')) {
                errors.push({ msg: 'Email already exists' });
            } else if (message.includes('users.username')) {
                errors.push({ msg: 'Username already exists' });
            } else {
                errors.push({ msg: 'Username or email already exists' });
            }
            return renderRegisterWithErrors(res, errors, username, email);
        }

        console.error('Registration error:', err);
        req.flash('error_msg', 'An error occurred during registration');
        return res.redirect('/auth/register');
    }
};

exports.login = async (req, res) => {
    const emailOrUsername = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!emailOrUsername || !password) {
        req.flash('error_msg', 'Please enter email and password');
        return res.redirect('/');
    }

    try {
        const user = await dbGet(
            'SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)',
            [emailOrUsername, emailOrUsername]
        );

        if (!user || !user.password_hash) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'Password incorrect');
            return res.redirect('/');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email || null,
            role: getEffectiveRole(user)
        };

        req.flash('success_msg', 'You are logged in');
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'An error occurred during login');
        return res.redirect('/');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
};
