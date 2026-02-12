const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const db = require('./models/db');
const { getEffectiveRole } = require('./config/auth');

const app = express();
const PORT = process.env.PORT || 3000;

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
    if (req.session.user) {
        req.session.user.role = getEffectiveRole(req.session.user);
    }
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
