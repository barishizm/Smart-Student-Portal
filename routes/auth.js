const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
});

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many login attempts. Please try again later.'
});

const passwordResetLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 6,
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many password reset requests. Please try again later.'
});

const profileUploadDir = path.resolve(__dirname, '../public/uploads/profile');
fs.mkdirSync(profileUploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, profileUploadDir),
	filename: (req, file, cb) => {
		const userId = req.session?.user?.id || 'user';
		const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
		cb(null, `avatar-${userId}-${Date.now()}.${ext}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.mimetype)) {
			return cb(new Error('INVALID_FILE_TYPE'));
		}
		return cb(null, true);
	}
});

const requireProfileSession = (req, res, next) => {
	if (!req.session?.user?.id) {
		req.flash('error_msg', 'Please log in first');
		return res.redirect('/');
	}
	return next();
};

// Register Page
router.get('/register', authController.registerPage);

// Register Handle
router.post('/register', authLimiter, authController.register);

// Login Handle
router.post('/login', loginLimiter, authController.login);

// Forgot Password
router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', passwordResetLimiter, authController.requestPasswordReset);

// Reset Password
router.get('/reset-password/:token', authController.resetPasswordPage);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// Change Username Handle
router.post('/change-username', authController.changeUsername);

// Change Password Handle
router.post('/change-password', authController.changePassword);

// Language preference
router.post('/language', authController.updatePreferredLanguage);

// Profile Photo
router.post('/profile-photo', requireProfileSession, (req, res) => {
	upload.single('profile_photo')(req, res, (err) => {
		if (!err) {
			return authController.updateProfilePhoto(req, res);
		}

		if (err.code === 'LIMIT_FILE_SIZE') {
			req.flash('error_msg', 'Image size must be 2MB or less');
			return res.redirect('/profile');
		}

		req.flash('error_msg', 'Only jpg, png, or webp images are allowed');
		return res.redirect('/profile');
	});
});
router.post('/profile-photo/delete', requireProfileSession, authController.deleteProfilePhoto);

// Logout Handle
router.get('/logout', authController.logout);

module.exports = router;
