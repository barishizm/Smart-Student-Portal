const express = require('express');
const router = express.Router();
const db = require('../models/db');

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

module.exports = router;
