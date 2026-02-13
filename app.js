const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const db = require('./models/db');
const { getEffectiveRole } = require('./config/auth');

const app = express();
const PORT = process.env.PORT || 3001;

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekCycle = (date) => {
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.min(4, Math.floor((dayOfMonth - 1) / 7) + 1);
    return weekOfMonth % 2 === 1 ? 1 : 2;
};

const getCurrentLectureLabel = (date) => {
    const nowMinutes = (date.getHours() * 60) + date.getMinutes();

    const slots = [
        { start: 8 * 60 + 30, end: 10 * 60 + 5, label: '1st lecture' },
        { start: 10 * 60 + 20, end: 11 * 60 + 55, label: '2nd lecture' },
        { start: 12 * 60 + 10, end: 13 * 60 + 45, label: '3rd lecture' },
        { start: 13 * 60 + 45, end: 14 * 60 + 30, label: 'Lunch Break' },
        { start: 14 * 60 + 30, end: 16 * 60 + 5, label: '4th lecture' },
        { start: 16 * 60 + 20, end: 17 * 60 + 55, label: '5th lecture' },
        { start: 18 * 60 + 10, end: 19 * 60 + 45, label: '6th lecture' },
        { start: 19 * 60 + 55, end: 21 * 60 + 30, label: '7th lecture' }
    ];

    const activeSlot = slots.find((slot) => nowMinutes >= slot.start && nowMinutes < slot.end);
    if (activeSlot) {
        return activeSlot.label;
    }

    return 'Break';
};

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: 'secret_key_change_this_later', // In production, use environment variable
    resave: false,
    saveUninitialized: false
}));

// Flash messages
app.use(flash());

// Global variables for flash messages and user session
app.use((req, res, next) => {
    const now = new Date();

    if (req.session.user) {
        req.session.user.role = getEffectiveRole(req.session.user);
    }

    res.locals.headerInfo = {
        date: formatDateLocal(now),
        week: getWeekCycle(now),
        lecture: getCurrentLectureLabel(now)
    };

    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin/students', studentRoutes); // Protected route will be handled in studentRoutes

// Start server only after DB migrations are ready.
db.ready
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server started on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
