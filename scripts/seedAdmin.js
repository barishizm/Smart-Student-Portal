const db = require('../models/db');
const bcrypt = require('bcrypt');
const { ADMIN_IDENTIFIER } = require('../config/auth');

const seedAdmin = async () => {
    const username = ADMIN_IDENTIFIER;
    const email = ADMIN_IDENTIFIER;
    const password = 'admin';
    const saltRounds = 10;

    db.get("SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)", [username, email], async (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (row) {
            db.run("UPDATE users SET username = ?, email = ?, role = 'admin' WHERE id = ?", [username, email, row.id], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr.message);
                } else {
                    console.log('Admin user already exists and was normalized.');
                }
            });
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            db.run("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", [username, email, hash, 'admin'], (err) => {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log(`Admin user created.\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}`);
                }
            });
        }
    });
};

db.ready
    .then(() => seedAdmin())
    .catch((err) => {
        console.error('Failed to seed admin:', err.message);
    });
