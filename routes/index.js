const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { getEffectiveRole } = require('../config/auth');

const dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });

const dbGet = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

const getWeekCycle = (date) => {
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.min(4, Math.floor((dayOfMonth - 1) / 7) + 1);
    return weekOfMonth % 2 === 1 ? 1 : 2;
};

const toScheduleDayOfWeek = (date) => {
    const jsDay = date.getDay();
    return jsDay === 0 ? 7 : jsDay;
};

const isEntryInCurrentWeekPattern = (entry, activeWeek) => {
    if (entry.week_pattern === 'all') return true;
    if (entry.week_pattern === 'week1') return activeWeek === 1;
    if (entry.week_pattern === 'week2') return activeWeek === 2;
    return true;
};

// Login Page (Home)
router.get('/', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// Dashboard (Protected)
router.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }

    try {
        const [scheduleEntries, scheduleGroups, studentRecord] = await Promise.all([
            dbAll(
            `SELECT id, group_name, day_of_week, start_time, end_time, subject, classroom, lecturer, lecture_type, week_pattern
             FROM schedules
             ORDER BY group_name ASC, day_of_week ASC, start_time ASC`
            ),
            dbAll(
            `SELECT DISTINCT trim(group_name) AS group_name
             FROM students
             WHERE group_name IS NOT NULL AND trim(group_name) != ''
             ORDER BY trim(group_name) ASC`
            ),
            dbGet(
            `SELECT trim(group_name) AS group_name
             FROM students
             WHERE user_id = ?
             LIMIT 1`,
            [req.session.user.id]
            )
        ]);

        const effectiveRole = req.session.user.role;
        const studentGroupName = String(studentRecord?.group_name || '').trim().toLowerCase();
        const entriesForCurrentUser = effectiveRole === 'admin'
            ? scheduleEntries
            : scheduleEntries.filter((entry) => String(entry.group_name || '').trim().toLowerCase() === studentGroupName);

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const activeWeek = getWeekCycle(now);
        const todayDay = toScheduleDayOfWeek(now);
        const tomorrowDay = toScheduleDayOfWeek(tomorrow);

        const currentWeekEntries = entriesForCurrentUser.filter((entry) => isEntryInCurrentWeekPattern(entry, activeWeek));

        const todayTomorrowSchedule = currentWeekEntries.filter((entry) => {
            const entryDay = Number(entry.day_of_week);
            return entryDay === todayDay || entryDay === tomorrowDay;
        });

        const weeklyScheduleByDay = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
            dayOfWeek,
            lessons: currentWeekEntries.filter((entry) => Number(entry.day_of_week) === dayOfWeek),
        }));

        const allSchedulesByDay = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
            dayOfWeek,
            lessons: entriesForCurrentUser.filter((entry) => Number(entry.day_of_week) === dayOfWeek),
        }));

        return res.render('dashboard', {
            user: req.session.user,
            todayDay,
            tomorrowDay,
            todayTomorrowSchedule,
            weeklyScheduleByDay,
            allSchedulesByDay,
            allScheduleEntries: scheduleEntries,
            scheduleGroups,
        });
    } catch (err) {
        console.error('Failed to load schedules for dashboard:', err);
        return res.render('dashboard', {
            user: req.session.user,
            todayDay: null,
            tomorrowDay: null,
            todayTomorrowSchedule: [],
            weeklyScheduleByDay: [],
            allSchedulesByDay: [],
            allScheduleEntries: [],
            scheduleGroups: [],
        });
    }
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

router.post('/contact', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const message = String(req.body?.message || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (name.length > 120 || email.length > 255 || message.length > 5000) {
        return res.status(400).json({ success: false, error: 'Input is too long.' });
    }

    db.run(
        `INSERT INTO contact_messages (user_id, name, email, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [req.session.user.id, name, email, message, Date.now()],
        function onInsert(err) {
            if (err) {
                console.error('Failed to save contact message:', err);
                return res.status(500).json({ success: false, error: 'Could not send message right now.' });
            }

            return res.status(201).json({ success: true, id: this.lastID });
        }
    );
});

router.get('/contact/messages', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/');
    }

    if (getEffectiveRole(req.session.user) !== 'admin') {
        req.flash('error_msg', 'You are not authorized to access this resource');
        return res.redirect('/dashboard');
    }

    const search = String(req.query?.search || '').trim();
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const where = [];
    const params = [];

    if (search) {
        const keyword = `%${search}%`;
        where.push('(cm.name LIKE ? OR cm.email LIKE ? OR cm.message LIKE ? OR COALESCE(u.username, \"\") LIKE ?)');
        params.push(keyword, keyword, keyword, keyword);
    }

    if (fromDate) {
        const startDate = new Date(`${fromDate}T00:00:00`);
        if (!Number.isNaN(startDate.getTime())) {
            where.push('cm.created_at >= ?');
            params.push(startDate.getTime());
        }
    }

    if (toDate) {
        const endDate = new Date(`${toDate}T23:59:59.999`);
        if (!Number.isNaN(endDate.getTime())) {
            where.push('cm.created_at <= ?');
            params.push(endDate.getTime());
        }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    db.all(
        `SELECT cm.id, cm.name, cm.email, cm.message, cm.created_at, u.username
         FROM contact_messages cm
         LEFT JOIN users u ON u.id = cm.user_id
         ${whereSql}
         ORDER BY cm.created_at DESC
         LIMIT 200`,
        params,
        (err, rows) => {
            if (err) {
                console.error('Failed to load contact messages:', err);
                req.flash('error_msg', 'Could not load contact messages');
                return res.redirect('/dashboard');
            }

            return res.render('contact-messages', {
                user: req.session.user,
                messages: rows || [],
                filters: {
                    search,
                    from: fromDate,
                    to: toDate,
                },
            });
        }
    );
});

module.exports = router;
