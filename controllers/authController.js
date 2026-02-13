const db = require('../models/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isAdminIdentity, getEffectiveRole } = require('../config/auth');
const { normalizeLanguage } = require('../utils/i18n');

const isSchoolEmail = (email) => /@(stud\.)?vilniustech\.lt$/i.test((email || '').trim());
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const hashResetToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const profileUploadDir = path.resolve(__dirname, '../public/uploads/profile');
const buildAutoStudentId = (userId) => `REG-AUTO-${userId}`;

const isStoredAvatarPath = (avatarPath) =>
    typeof avatarPath === 'string' && /^\/uploads\/profile\/[a-zA-Z0-9._-]+$/.test(avatarPath);

const deleteAvatarFileFromDisk = (avatarPath) => {
    if (!isStoredAvatarPath(avatarPath)) {
        return;
    }

    const relativePath = avatarPath.replace(/^\//, '');
    const absolutePath = path.resolve(__dirname, `../public/${relativePath}`);

    if (!absolutePath.startsWith(profileUploadDir)) {
        return;
    }

    fs.unlink(absolutePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete avatar file:', err.message);
        }
    });
};

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

const regenerateSession = (req) =>
    new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

const renderRegisterWithErrors = (res, errors, formData) => {
    return res.status(400).render('register', {
        errors,
        formData,
        error_msg: errors.map((err) => err.msg).join('<br>')
    });
};

exports.registerPage = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { formData: {} });
};

exports.register = async (req, res) => {
    const firstName = (req.body.first_name || '').trim();
    const lastName = (req.body.last_name || '').trim();
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirm_password || '';
    const preferredLanguage = normalizeLanguage(req.session?.preferred_language || 'en');
    const formData = { firstName, lastName, username, email };
    let errors = [];

    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
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

    if (email && !isSchoolEmail(email)) {
        errors.push({ msg: 'only school mail is accepted.' });
    }

    if (errors.length > 0) {
        return renderRegisterWithErrors(res, errors, formData);
    }

    try {
        const existingUser = await dbGet(
            'SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)',
            [email, username]
        );

        if (existingUser) {
            if ((existingUser.email || '').toLowerCase() === email) {
                errors.push({ msg: 'Email already exists' });
            }
            if ((existingUser.username || '').toLowerCase() === username.toLowerCase()) {
                errors.push({ msg: 'Username already exists' });
            }
            return renderRegisterWithErrors(res, errors, formData);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const createdUser = await dbRun(
            'INSERT INTO users (first_name, last_name, username, email, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [firstName, lastName, username, email, passwordHash, 'student', preferredLanguage]
        );

        const autoStudentId = buildAutoStudentId(createdUser.lastID);
        const safeFirstName = firstName || username || 'Student';
        const safeLastName = lastName || 'User';

        await dbRun(
            'INSERT OR IGNORE INTO students (name, surname, student_id, email, user_id, group_name, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [safeFirstName, safeLastName, autoStudentId, email, createdUser.lastID, null, null]
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
            return renderRegisterWithErrors(res, errors, formData);
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
        req.flash('error_msg', 'Please enter email/username and password');
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

        await regenerateSession(req);

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email || null,
            avatar_url: user.avatar_url || null,
            first_name: user.first_name || null,
            last_name: user.last_name || null,
            role: getEffectiveRole(user),
            preferred_language: normalizeLanguage(user.preferred_language || req.session?.preferred_language || 'en')
        };

        req.session.preferred_language = req.session.user.preferred_language;

        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'An error occurred during login');
        return res.redirect('/');
    }
};

exports.changeUsername = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        req.flash('error_msg', 'Please log in first');
        return res.redirect('/');
    }

    const sessionUserId = req.session.user.id;
    const currentIdentity = (req.body.current_identity || '').trim();
    const password = req.body.password || '';
    const newUsername = (req.body.new_username || '').trim();

    if (!currentIdentity || !password || !newUsername) {
        req.flash('error_msg', 'Please fill all username change fields');
        return res.redirect('/profile');
    }

    if (newUsername.length < 3) {
        req.flash('error_msg', 'New username must be at least 3 characters');
        return res.redirect('/profile');
    }

    if (isAdminIdentity({ username: newUsername })) {
        req.flash('error_msg', 'This identity is reserved for the system administrator');
        return res.redirect('/profile');
    }

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [sessionUserId]);

        if (!user || !user.password_hash) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile');
        }

        const normalizedCurrentIdentity = currentIdentity.toLowerCase();
        const identityMatches =
            (user.username || '').toLowerCase() === normalizedCurrentIdentity ||
            (user.email || '').toLowerCase() === normalizedCurrentIdentity;

        if (!identityMatches) {
            req.flash('error_msg', 'Current identity does not match your account');
            return res.redirect('/profile');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'Password incorrect');
            return res.redirect('/profile');
        }

        const existingUsername = await dbGet(
            'SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?',
            [newUsername, user.id]
        );

        if (existingUsername) {
            req.flash('error_msg', 'Username already exists');
            return res.redirect('/profile');
        }

        await dbRun('UPDATE users SET username = ? WHERE id = ?', [newUsername, user.id]);

        if (req.session.user && req.session.user.id === user.id) {
            req.session.user.username = newUsername;
            req.session.user.role = getEffectiveRole({ ...req.session.user, username: newUsername });
        }

        req.flash('success_msg', 'Username updated successfully. You can sign in with your new username.');
        return res.redirect('/profile');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            req.flash('error_msg', 'Username already exists');
            return res.redirect('/profile');
        }

        console.error('Change username error:', err);
        req.flash('error_msg', 'An error occurred while updating username');
        return res.redirect('/profile');
    }
};

exports.changePassword = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        req.flash('error_msg', 'Please log in first');
        return res.redirect('/');
    }

    const userId = req.session.user.id;
    const currentPassword = req.body.current_password || '';
    const newPassword = req.body.new_password || '';
    const confirmPassword = req.body.confirm_password || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
        req.flash('error_msg', 'Please fill all password fields');
        return res.redirect('/profile');
    }

    if (newPassword.length < 6) {
        req.flash('error_msg', 'New password must be at least 6 characters');
        return res.redirect('/profile');
    }

    if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'New passwords do not match');
        return res.redirect('/profile');
    }

    try {
        const user = await dbGet('SELECT id, password_hash FROM users WHERE id = ?', [userId]);
        if (!user || !user.password_hash) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

        req.flash('success_msg', 'Password updated successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.error('Change password error:', err);
        req.flash('error_msg', 'An error occurred while updating password');
        return res.redirect('/profile');
    }
};

exports.updateProfilePhoto = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        req.flash('error_msg', 'Please log in first');
        return res.redirect('/');
    }

    const userId = req.session.user.id;

    if (!req.file) {
        req.flash('error_msg', 'Please choose an image file (jpg, png, webp)');
        return res.redirect('/profile');
    }

    try {
        const user = await dbGet('SELECT id, avatar_url FROM users WHERE id = ?', [userId]);
        if (!user) {
            deleteAvatarFileFromDisk(`/uploads/profile/${req.file.filename}`);
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile');
        }

        const newAvatarUrl = `/uploads/profile/${req.file.filename}`;
        await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', [newAvatarUrl, userId]);

        req.session.user.avatar_url = newAvatarUrl;
        if (user.avatar_url && user.avatar_url !== newAvatarUrl) {
            deleteAvatarFileFromDisk(user.avatar_url);
        }

        req.flash('success_msg', 'Profile photo updated successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.error('Update profile photo error:', err);
        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }
        req.flash('error_msg', 'Could not update profile photo');
        return res.redirect('/profile');
    }
};

exports.deleteProfilePhoto = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        req.flash('error_msg', 'Please log in first');
        return res.redirect('/');
    }

    const userId = req.session.user.id;

    try {
        const user = await dbGet('SELECT id, avatar_url FROM users WHERE id = ?', [userId]);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile');
        }

        if (!user.avatar_url) {
            req.flash('error_msg', 'No profile photo to delete');
            return res.redirect('/profile');
        }

        await dbRun('UPDATE users SET avatar_url = NULL WHERE id = ?', [userId]);
        req.session.user.avatar_url = null;
        deleteAvatarFileFromDisk(user.avatar_url);

        req.flash('success_msg', 'Profile photo deleted successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.error('Delete profile photo error:', err);
        req.flash('error_msg', 'Could not delete profile photo');
        return res.redirect('/profile');
    }
};

exports.forgotPasswordPage = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    return res.render('forgot-password');
};

exports.requestPasswordReset = async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const genericMessage = 'If that account exists, a password reset link has been sent.';

    if (!email) {
        req.flash('error_msg', 'Please enter your email address');
        return res.redirect('/auth/forgot-password');
    }

    try {
        const now = Date.now();

        await dbRun(
            'DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < ?',
            [now]
        );

        const user = await dbGet('SELECT id, email FROM users WHERE lower(email) = lower(?)', [email]);

        if (user && user.id) {
            const recentToken = await dbGet(
                'SELECT id FROM password_reset_tokens WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1',
                [user.id, now - 60 * 1000]
            );

            if (!recentToken) {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = hashResetToken(rawToken);
                const expiresAt = now + RESET_TOKEN_TTL_MS;

                await dbRun('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL', [user.id]);
                await dbRun(
                    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
                    [user.id, tokenHash, expiresAt, now]
                );

                console.log(`[DEV] Password reset link: /auth/reset-password/${rawToken}`);
            }
        }

        req.flash('success_msg', genericMessage);
        return res.redirect('/auth/forgot-password');
    } catch (err) {
        console.error('Request password reset error:', err);
        req.flash('success_msg', genericMessage);
        return res.redirect('/auth/forgot-password');
    }
};

exports.resetPasswordPage = async (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }

    const token = (req.params.token || '').trim();
    if (!token) {
        req.flash('error_msg', 'Reset link is invalid or expired');
        return res.redirect('/auth/forgot-password');
    }

    try {
        const tokenHash = hashResetToken(token);
        const now = Date.now();

        const resetRow = await dbGet(
            'SELECT id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1',
            [tokenHash, now]
        );

        if (!resetRow) {
            req.flash('error_msg', 'Reset link is invalid or expired');
            return res.redirect('/auth/forgot-password');
        }

        return res.render('reset-password', { token });
    } catch (err) {
        console.error('Reset password page error:', err);
        req.flash('error_msg', 'Reset link is invalid or expired');
        return res.redirect('/auth/forgot-password');
    }
};

exports.resetPassword = async (req, res) => {
    const token = (req.body.token || '').trim();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirm_password || '';

    if (!token || !password || !confirmPassword) {
        req.flash('error_msg', 'Please enter all fields');
        return res.redirect('/auth/forgot-password');
    }

    if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect(`/auth/reset-password/${token}`);
    }

    if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters');
        return res.redirect(`/auth/reset-password/${token}`);
    }

    try {
        const tokenHash = hashResetToken(token);
        const now = Date.now();

        const resetRow = await dbGet(
            'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1',
            [tokenHash, now]
        );

        if (!resetRow) {
            req.flash('error_msg', 'Reset link is invalid or expired');
            return res.redirect('/auth/forgot-password');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRow.user_id]);
        await dbRun('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [now, resetRow.user_id]);

        req.flash('success_msg', 'Password updated successfully. Please sign in.');
        return res.redirect('/');
    } catch (err) {
        console.error('Reset password error:', err);
        req.flash('error_msg', 'Could not reset password. Please try again.');
        return res.redirect('/auth/forgot-password');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.clearCookie('ssp.sid');
        res.redirect('/');
    });
};

exports.updatePreferredLanguage = async (req, res) => {
    const nextLanguage = normalizeLanguage(req.body?.language || req.body?.lang || 'en');

    try {
        req.session.preferred_language = nextLanguage;

        if (req.session?.user?.id) {
            await dbRun('UPDATE users SET preferred_language = ? WHERE id = ?', [nextLanguage, req.session.user.id]);
            req.session.user.preferred_language = nextLanguage;
        }

        return res.json({ success: true, language: nextLanguage });
    } catch (err) {
        console.error('Update preferred language error:', err);
        return res.status(500).json({ error: 'Could not update language preference' });
    }
};
